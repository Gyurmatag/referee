import { DurableObject } from "cloudflare:workers";
import { TAKEOVER_LIMIT_MS, aggregate, parseJudgeReport, type Phase, type Review } from "@referee/shared";
import {
  getEvent,
  getSubmission,
  getSubmissionSecrets,
  insertEvent,
  insertJudgeRun,
  listOverrides,
  updateJudgeRun,
  updateSubmission,
  upsertDeployment,
  upsertProvenance,
  upsertReview,
  type CoreEnv,
} from "../db/queries.js";
import { fetchProvenance } from "../provenance/github.js";
import {
  finishSandboxReview,
  pollSandboxReview,
  startSandboxReview,
} from "../review/sandbox-review.js";
import {
  createRunner,
  isTerminalPhase,
  timedOut,
  type JudgeRunner,
} from "../runner/index.js";
import type { JudgeInput, RunnerMeta } from "../runner/types.js";
import { deployNotes, deploySubmission } from "../sandbox/deploy.js";
import { publishWall } from "../wall-publish.js";
import { judgesStartTogether } from "../judge-parallel.js";

type PipelineStep =
  | "queued"
  | "provenance"
  | "wait_slot"
  | "judge1"
  | "deploy"
  | "wait_slot_j2"
  | "judge2"
  | "review"
  | "review_wait"
  | "takeover"
  | "wait_tracks_parallel"
  | "aggregate"
  | "done"
  | "failed";

type DoState = {
  submissionId: string;
  step: PipelineStep;
  runId: string | null;
  runnerMeta: RunnerMeta | null;
  judgeRunId: string | null;
  judgeStartedAt: string | null;
  lastPhase: string | null;
  queuePosition: number | null;
  hints: string;
  currentJudge: "build_e2e" | "tracks";
  takeoverStartedAt?: string | null;
  parallel?: boolean;
  otherRunId?: string | null;
  otherRunnerMeta?: RunnerMeta | null;
  otherJudgeRunId?: string | null;
  otherStartedAt?: string | null;
  otherLastPhase?: string | null;
  otherDone?: boolean;
};

export class SubmissionDO extends DurableObject<CoreEnv> {
  private runners = new Map<string, JudgeRunner>();

  private async load(): Promise<DoState | null> {
    return (await this.ctx.storage.get<DoState>("state")) ?? null;
  }

  private async save(state: DoState): Promise<void> {
    await this.ctx.storage.put("state", state);
  }

  private getRunner(judge: "build_e2e" | "tracks"): JudgeRunner {
    const existing = this.runners.get(judge);
    if (existing) return existing;
    const created = createRunner(this.env, judge);
    this.runners.set(judge, created);
    return created;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/start") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { id?: string; hints?: string };
      await this.start(body.id || this.ctx.id.name || "unknown", body.hints ?? "");
      return Response.json({ ok: true });
    }
    if (url.pathname.endsWith("/rejudge") && request.method === "POST") {
      const state = await this.load();
      const id = state?.submissionId || this.ctx.id.name || "unknown";
      await this.start(id, state?.hints ?? "");
      return Response.json({ ok: true, id });
    }
    if (url.pathname.endsWith("/review-now") && request.method === "POST") {
      const state = await this.load();
      const id = state?.submissionId || this.ctx.id.name || "unknown";
      this.ctx.waitUntil(this.runReviewNow(id));
      return Response.json({ ok: true, id, started: true });
    }
    if (url.pathname.endsWith("/takeover-continue") && request.method === "POST") {
      const state = await this.load();
      if (state?.step === "takeover") {
        await this.ctx.storage.setAlarm(Date.now() + 50);
      }
      return Response.json({ ok: true });
    }
    if (url.pathname.endsWith("/appeal") && request.method === "POST") {
      const body = await request.json<{ hints?: string }>().catch(() => ({ hints: "" }));
      const state = await this.load();
      const id = state?.submissionId || this.ctx.id.name || "unknown";
      const hints = [state?.hints, body.hints].filter(Boolean).join("\n");
      await this.start(id, hints);
      return Response.json({ ok: true, id });
    }
    return new Response("not found", { status: 404 });
  }

  async start(submissionId: string, hints = ""): Promise<{ ok: true }> {
    await this.save({
      submissionId,
      step: "queued",
      runId: null,
      runnerMeta: null,
      judgeRunId: null,
      judgeStartedAt: null,
      lastPhase: null,
      queuePosition: null,
      hints,
      currentJudge: "build_e2e",
      takeoverStartedAt: null,
    });
    await updateSubmission(this.env.DB, submissionId, {
      status: "queued",
      updated_at: now(),
    });
    await this.ctx.storage.setAlarm(Date.now() + 50);
    return { ok: true };
  }

  async alarm(): Promise<void> {
    const state = await this.load();
    if (!state) return;
    if (state.step === "done" || state.step === "failed") return;

    try {
      if (state.step === "queued" || state.step === "provenance") {
        await this.runProvenance(state);
        return;
      }
      if (state.step === "wait_slot") {
        await this.trySlot(state, "build_e2e");
        const latest = await this.load();
        if (latest?.parallel && !latest.otherRunId && !latest.otherDone) {
          await this.tryStartOther(latest);
        }
        return;
      }
      if (state.step === "judge1") {
        await this.pollJudge(state, "build_e2e", "deploy");
        if (state.parallel && !state.otherDone) {
          await this.pollOtherJudge(state);
        }
        return;
      }
      if (state.step === "deploy") {
        await this.runDeploy(state);
        return;
      }
      if (state.step === "wait_slot_j2") {
        await this.trySlot(state, "tracks");
        return;
      }
      if (state.step === "judge2") {
        await this.pollJudge(state, "tracks", "aggregate");
        return;
      }
      if (state.step === "wait_tracks_parallel") {
        await this.pollOtherJudge(state);
        const latest = await this.load();
        if (latest?.otherDone) {
          latest.step = "aggregate";
          await this.save(latest);
          await this.runAggregate(latest);
        }
        return;
      }
      if (state.step === "review") {
        await this.runReview(state);
        return;
      }
      if (state.step === "review_wait") {
        await this.pollTakeover(state, false);
        return;
      }
      if (state.step === "takeover") {
        await this.pollTakeover(state);
        return;
      }
      if (state.step === "aggregate") {
        await this.runAggregate(state);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "pipeline error";
      await this.emit(state.submissionId, "error", message);
      if (state.step === "queued" || state.step === "provenance") {
        await this.fail(state, message);
        return;
      }
      const next: Record<PipelineStep, PipelineStep> = {
        queued: "failed",
        provenance: "wait_slot",
        wait_slot: "deploy",
        judge1: "deploy",
        deploy: "review",
        review: "wait_slot_j2",
        review_wait: "wait_slot_j2",
        takeover: "wait_slot_j2",
        wait_slot_j2: "aggregate",
        judge2: "aggregate",
        wait_tracks_parallel: "aggregate",
        aggregate: "done",
        done: "done",
        failed: "failed",
      };
      state.step = next[state.step] ?? "aggregate";
      await this.save(state);
      if (state.step === "failed") {
        await this.fail(state, message);
        return;
      }
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }

  private async runProvenance(state: DoState): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    await updateSubmission(this.env.DB, sub.id, {
      status: "judging",
      updated_at: now(),
    });
    const event = await getEvent(this.env.DB, sub.event_id);
    try {
      const { provenance, headSha } = await fetchProvenance({
        repoUrl: sub.repo_url,
        windowStart: event.window_start,
        windowEnd: event.window_end,
        token: this.env.GITHUB_TOKEN,
      });
      await upsertProvenance(this.env.DB, sub.id, provenance);
      await updateSubmission(this.env.DB, sub.id, {
        status: "judging",
        head_sha: headSha,
        updated_at: now(),
      });
      await this.emit(sub.id, "provenance", `in window ${provenance.in_window_ratio.toFixed(2)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "provenance failed";
      await upsertProvenance(this.env.DB, sub.id, {
        repo_created_at: "",
        is_fork: false,
        parent_repo: null,
        commits: [],
        in_window_ratio: 0,
        bot_commit_ratio: 0,
        coauthor_devin_ratio: 0,
        devin_prs: 0,
        notes: message,
      });
      await this.emit(sub.id, "provenance", message);
    }
    state.step = "wait_slot";
    state.currentJudge = "build_e2e";
    state.parallel = judgesStartTogether(this.env.JUDGE_PARALLEL);
    state.otherDone = false;
    await this.save(state);
    await this.trySlot(state, "build_e2e");
    if (state.parallel) {
      await this.tryStartOther(state);
    }
  }

  private async trySlot(state: DoState, judge: "build_e2e" | "tracks"): Promise<void> {
    const id = this.env.SCHEDULER.idFromName("global");
    const stub = this.env.SCHEDULER.get(id);
    const result = await stub.fetch("https://scheduler/request", {
      method: "POST",
      body: JSON.stringify({
        submissionId: state.submissionId,
        judge,
      }),
    });
    const slot = (await result.json()) as { granted: boolean; position: number };
    if (!slot.granted) {
      state.queuePosition = slot.position;
      await this.save(state);
      await updateSubmission(this.env.DB, state.submissionId, {
        status: "queued",
        queue_position: slot.position,
        updated_at: now(),
      });
      await this.ctx.storage.setAlarm(Date.now() + 10_000);
      return;
    }
    try {
      await this.startJudge(state, judge);
    } catch (error) {
      const message = error instanceof Error ? error.message : "judge start failed";
      await this.emit(state.submissionId, judge, message);
      await this.releaseSlot(state.submissionId, judge);
      state.step = judge === "build_e2e" ? "deploy" : "aggregate";
      state.runId = null;
      state.judgeRunId = null;
      await this.save(state);
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }

  private judgeInput(
    sub: NonNullable<Awaited<ReturnType<typeof getSubmission>>>,
    event: Awaited<ReturnType<typeof getEvent>>,
    judge: "build_e2e" | "tracks",
    hints: string,
    secrets: Record<string, string>,
  ): JudgeInput {
    return {
      submissionId: sub.id,
      judge,
      repo: sub.repo_url,
      sha: sub.head_sha,
      claims: sub.claims,
      runHints: sub.run_hints,
      tracks: event.tracks,
      window: { start: event.window_start, end: event.window_end },
      hints,
      liveUrl: sub.live_url ?? sub.deployment?.url,
      secrets,
    };
  }

  private async startJudge(state: DoState, judge: "build_e2e" | "tracks"): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    const event = await getEvent(this.env.DB, sub?.event_id);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    const runner = this.getRunner(judge);
    const started = now();
    const secrets = await getSubmissionSecrets(this.env.DB, sub.id);
    const { runId, meta } = await runner.start(
      this.judgeInput(sub, event, judge, state.hints, secrets),
    );
    const judgeRunId = crypto.randomUUID();
    const runnerName =
      judge === "tracks"
        ? this.env.JUDGE_RUNNER_TRACKS || "cli-sandbox"
        : this.env.JUDGE_RUNNER_BUILD_E2E || "cli-sandbox";
    await insertJudgeRun(this.env.DB, {
      id: judgeRunId,
      submission_id: sub.id,
      judge,
      runner: runnerName,
      phase: "starting",
      log_tail: "",
      report: null,
      transcript_key: null,
      session_url: "",
      started_at: started,
      finished_at: null,
      error: null,
    });
    await updateSubmission(this.env.DB, sub.id, {
      status: "judging",
      queue_position: 0,
      updated_at: now(),
    });
    await this.emit(sub.id, judge, "starting");
    state.step = judge === "build_e2e" ? "judge1" : "judge2";
    state.currentJudge = judge;
    state.runId = runId;
    state.runnerMeta = meta ?? null;
    state.judgeRunId = judgeRunId;
    state.judgeStartedAt = started;
    state.lastPhase = "starting";
    state.queuePosition = 0;
    await this.save(state);
    await this.ctx.storage.setAlarm(Date.now() + 10_000);
  }

  private async tryStartOther(state: DoState): Promise<void> {
    const id = this.env.SCHEDULER.idFromName("global");
    const stub = this.env.SCHEDULER.get(id);
    const result = await stub.fetch("https://scheduler/request", {
      method: "POST",
      body: JSON.stringify({
        submissionId: state.submissionId,
        judge: "tracks",
      }),
    });
    const slot = (await result.json()) as { granted: boolean; position: number };
    if (!slot.granted) {
      state.queuePosition = slot.position;
      await this.save(state);
      return;
    }
    try {
      const sub = await getSubmission(this.env.DB, state.submissionId);
      const event = await getEvent(this.env.DB, sub?.event_id);
      if (!sub) return;
      const runner = this.getRunner("tracks");
      const started = now();
      const secrets = await getSubmissionSecrets(this.env.DB, sub.id);
      const { runId, meta } = await runner.start(
        this.judgeInput(sub, event, "tracks", state.hints, secrets),
      );
      const judgeRunId = crypto.randomUUID();
      await insertJudgeRun(this.env.DB, {
        id: judgeRunId,
        submission_id: sub.id,
        judge: "tracks",
        runner: this.env.JUDGE_RUNNER_TRACKS || "cli-sandbox",
        phase: "starting",
        log_tail: "",
        report: null,
        transcript_key: null,
        session_url: "",
        started_at: started,
        finished_at: null,
        error: null,
      });
      await this.emit(sub.id, "tracks", "starting");
      state.otherRunId = runId;
      state.otherRunnerMeta = meta ?? null;
      state.otherJudgeRunId = judgeRunId;
      state.otherStartedAt = started;
      state.otherLastPhase = "starting";
      state.otherDone = false;
      await this.save(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "tracks start failed";
      await this.emit(state.submissionId, "tracks", message);
      await this.releaseSlot(state.submissionId, "tracks");
      state.otherDone = true;
      await this.save(state);
    }
  }

  private async pollOtherJudge(state: DoState): Promise<void> {
    if (!state.otherRunId || !state.otherJudgeRunId || !state.otherStartedAt) {
      if (!state.otherDone) {
        await this.tryStartOther(state);
      }
      return;
    }
    const limit = Number(this.env.JUDGE_TIME_LIMIT_MIN || "20");
    const runner = this.getRunner("tracks");
    if (timedOut(state.otherStartedAt, Date.now(), limit)) {
      await runner.cancel(state.otherRunId);
      await updateJudgeRun(this.env.DB, state.otherJudgeRunId, {
        phase: "failed",
        error: "failed: timeout",
        finished_at: now(),
      });
      await this.releaseSlot(state.submissionId, "tracks");
      await this.emit(state.submissionId, "tracks", "failed: timeout");
      state.otherDone = true;
      state.otherRunId = null;
      await this.save(state);
      return;
    }
    if (state.otherRunnerMeta && runner.attach) {
      runner.attach(state.otherRunId, state.otherRunnerMeta);
    }
    const poll = await runner.poll(state.otherRunId);
    const phase = (poll.report?.phase ?? poll.phase) as Phase;
    const parsed = poll.report ? parseJudgeReport(poll.report) : { report: null };
    await updateJudgeRun(this.env.DB, state.otherJudgeRunId, {
      phase,
      log_tail: poll.logTail,
      report: parsed.report,
      session_url: poll.sessionUrl ?? "",
    });
    if (phase !== state.otherLastPhase) {
      await this.emit(state.submissionId, "tracks", phase);
      state.otherLastPhase = phase;
      await this.save(state);
    }
    if (isTerminalPhase(phase) || poll.exited) {
      if (state.otherRunnerMeta && runner.attach) {
        runner.attach(state.otherRunId, state.otherRunnerMeta);
      }
      const collected = runner.collect
        ? await runner.collect(state.otherRunId)
        : { transcriptKey: null, evidenceKeys: [], report: parsed.report };
      await updateJudgeRun(this.env.DB, state.otherJudgeRunId, {
        phase: collected.report?.phase ?? phase,
        report: collected.report ?? parsed.report,
        transcript_key: collected.transcriptKey,
        session_url: poll.sessionUrl ?? "",
        finished_at: now(),
        error: collected.report?.phase === "failed" ? collected.report.summary : null,
      });
      await this.releaseSlot(state.submissionId, "tracks");
      await this.emit(state.submissionId, "tracks", "tracks done");
      state.otherDone = true;
      state.otherRunId = null;
      state.otherRunnerMeta = null;
      state.otherJudgeRunId = null;
      await this.save(state);
    }
  }

  private async pollJudge(
    state: DoState,
    judge: "build_e2e" | "tracks",
    next: PipelineStep,
  ): Promise<void> {
    if (!state.runId || !state.judgeRunId || !state.judgeStartedAt) {
      await this.fail(state, `${judge} missing run id`);
      return;
    }
    const limit = Number(this.env.JUDGE_TIME_LIMIT_MIN || "20");
    const runner = this.getRunner(judge);
    if (timedOut(state.judgeStartedAt, Date.now(), limit)) {
      await runner.cancel(state.runId);
      await updateJudgeRun(this.env.DB, state.judgeRunId, {
        phase: "failed",
        error: "failed: timeout",
        finished_at: now(),
      });
      await this.releaseSlot(state.submissionId, judge);
      await this.emit(state.submissionId, judge, "failed: timeout");
      state.step = next;
      state.runId = null;
      state.runnerMeta = null;
      state.judgeRunId = null;
      await this.save(state);
      await this.ctx.storage.setAlarm(Date.now() + 50);
      return;
    }

    if (state.runnerMeta && runner.attach) {
      runner.attach(state.runId, state.runnerMeta);
    }
    const poll = await runner.poll(state.runId);
    const phase = (poll.report?.phase ?? poll.phase) as Phase;
    const parsed = poll.report ? parseJudgeReport(poll.report) : { report: null };
    await updateJudgeRun(this.env.DB, state.judgeRunId, {
      phase,
      log_tail: poll.logTail,
      report: parsed.report,
      session_url: poll.sessionUrl ?? "",
    });
    if (phase !== state.lastPhase) {
      await this.emit(state.submissionId, judge, phase);
      state.lastPhase = phase;
      await this.save(state);
    }

    if (isTerminalPhase(phase) || poll.exited) {
      if (state.runnerMeta && runner.attach) {
        runner.attach(state.runId, state.runnerMeta);
      }
      const collected = runner.collect
        ? await runner.collect(state.runId)
        : { transcriptKey: null, evidenceKeys: [], report: parsed.report };
      await updateJudgeRun(this.env.DB, state.judgeRunId, {
        phase: collected.report?.phase ?? phase,
        report: collected.report ?? parsed.report,
        transcript_key: collected.transcriptKey,
        session_url: poll.sessionUrl ?? "",
        finished_at: now(),
        error: collected.report?.phase === "failed" ? collected.report.summary : null,
      });
      await this.releaseSlot(state.submissionId, judge);
      await this.emit(state.submissionId, judge, `${judge} done`);
      state.step = next;
      state.runId = null;
      state.runnerMeta = null;
      state.judgeRunId = null;
      await this.save(state);
      await this.ctx.storage.setAlarm(Date.now() + 50);
      return;
    }

    await this.ctx.storage.setAlarm(Date.now() + 10_000);
  }

  private async runDeploy(state: DoState): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    await updateSubmission(this.env.DB, sub.id, {
      status: "deploying",
      updated_at: now(),
    });
    const build = sub.judge_runs.find((r) => r.judge === "build_e2e");
    const recipe = build?.report?.recipe ?? {
      install: "",
      build: "",
      start: "",
      port: 3000,
      env: {},
      needs_db: false,
      notes: "",
    };
    const secrets = await getSubmissionSecrets(this.env.DB, sub.id);
    const deployment = await deploySubmission(this.env, {
      submissionId: sub.id,
      repoUrl: sub.repo_url,
      sha: sub.head_sha,
      recipe,
      liveUrl: sub.live_url,
      teamName: sub.team_name,
      runHints: sub.run_hints,
      secrets,
    });
    await upsertDeployment(this.env.DB, sub.id, deployment);
    await this.emit(sub.id, "deploy", deployNotes(deployment));
    state.step = "review";
    await this.save(state);
    await this.runReview(state);
  }

  private async persistReview(submissionId: string, review: Review): Promise<void> {
    await upsertReview(this.env.DB, submissionId, review);
    await this.emit(submissionId, "review", review.summary);
  }

  private async failedReview(submissionId: string, message: string): Promise<void> {
    await upsertReview(this.env.DB, submissionId, {
      fork_repo: "",
      pr_url: "",
      review_url: "",
      summary: message,
      summary_score: 0.4,
      screenshots: [],
    });
    await this.emit(submissionId, "review", message);
  }

  private async continueAfterReview(state: DoState): Promise<void> {
    state.takeoverStartedAt = null;
    if (state.parallel && state.otherDone) {
      state.step = "aggregate";
      await this.save(state);
      await this.runAggregate(state);
      return;
    }
    if (state.parallel && (state.otherRunId || state.otherJudgeRunId)) {
      state.step = "wait_tracks_parallel";
      await this.save(state);
      await this.pollOtherJudge(state);
      const latest = await this.load();
      if (latest?.otherDone) {
        latest.step = "aggregate";
        await this.save(latest);
        await this.runAggregate(latest);
      }
      return;
    }
    state.step = "wait_slot_j2";
    state.currentJudge = "tracks";
    await this.save(state);
    await this.trySlot(state, "tracks");
  }

  private async pauseForTakeover(state: DoState, reason: string): Promise<void> {
    state.step = "takeover";
    state.takeoverStartedAt = state.takeoverStartedAt || now();
    await this.save(state);
    await updateSubmission(this.env.DB, state.submissionId, {
      status: "takeover",
      updated_at: now(),
    });
    await this.emit(state.submissionId, "takeover", reason);
    await this.ctx.storage.setAlarm(Date.now() + 2_000);
  }

  private async runReviewNow(submissionId: string): Promise<void> {
    const state = (await this.load()) ?? {
      submissionId,
      step: "review" as const,
      runId: null,
      runnerMeta: null,
      judgeRunId: null,
      judgeStartedAt: null,
      lastPhase: null,
      queuePosition: null,
      hints: "",
      currentJudge: "tracks" as const,
      takeoverStartedAt: null,
    };
    await this.runReview(state);
    const latest = await this.load();
    if (latest?.step === "done") await this.runAggregate(latest);
  }

  private async runReview(state: DoState): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    await this.emit(sub.id, "review", "starting isolated login review");
    try {
      const outcome = await startSandboxReview(this.env, sub);
      if (outcome.kind === "takeover") {
        await this.pauseForTakeover(state, outcome.reason);
        return;
      }
      if (outcome.kind === "running") {
        state.step = "review_wait";
        state.takeoverStartedAt = state.takeoverStartedAt || now();
        await this.save(state);
        await this.ctx.storage.setAlarm(Date.now() + 2_000);
        return;
      }
      await this.persistReview(sub.id, outcome.review);
    } catch (error) {
      await this.failedReview(sub.id, error instanceof Error ? error.message : "review failed");
    }
    await this.continueAfterReview(state);
  }

  private async pollTakeover(state: DoState, allowTimeout = true): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    const started = Date.parse(state.takeoverStartedAt || now());
    const limit = state.step === "takeover" ? TAKEOVER_LIMIT_MS : 180_000;
    const timedOut = Number.isFinite(started) && Date.now() - started > limit;
    try {
      if (timedOut && (allowTimeout || state.step === "review_wait")) {
        const review = await finishSandboxReview(this.env, sub);
        await this.persistReview(sub.id, review);
        await this.continueAfterReview(state);
        return;
      }
      const outcome = await pollSandboxReview(this.env, sub);
      if (outcome.kind === "done") {
        await this.persistReview(sub.id, outcome.review);
        await this.continueAfterReview(state);
        return;
      }
      if (outcome.kind === "takeover") {
        await this.pauseForTakeover(state, outcome.reason);
        return;
      }
    } catch (error) {
      await this.failedReview(sub.id, error instanceof Error ? error.message : "review failed");
      await this.continueAfterReview(state);
      return;
    }
    await this.ctx.storage.setAlarm(Date.now() + 2_000);
  }

  private async runAggregate(state: DoState): Promise<void> {
    const sub = await getSubmission(this.env.DB, state.submissionId);
    const event = await getEvent(this.env.DB, sub?.event_id);
    if (!sub) {
      await this.fail(state, "submission missing");
      return;
    }
    const reports = sub.judge_runs
      .map((r) => r.report)
      .filter((r): r is NonNullable<typeof r> => r !== null);
    const overrides = await listOverrides(this.env.DB, sub.id);
    const score = aggregate({
      reports,
      provenance: sub.provenance,
      review: sub.review,
      rubric: event.rubric,
      overrides,
    });
    await updateSubmission(this.env.DB, sub.id, {
      status: "done",
      score,
      confidence: score.confidence,
      queue_position: 0,
      updated_at: now(),
    });
    state.step = "done";
    await this.save(state);
    await this.emit(sub.id, "done", `score ${score.total.toFixed(1)}`);
  }

  private async releaseSlot(submissionId: string, judge: string): Promise<void> {
    try {
      const id = this.env.SCHEDULER.idFromName("global");
      const stub = this.env.SCHEDULER.get(id);
      await stub.fetch("https://scheduler/release", {
        method: "POST",
        body: JSON.stringify({ submissionId, judge }),
      });
    } catch {
      // slot reclaim is the scheduler's job if this fails
    }
  }

  private async fail(state: DoState, reason: string): Promise<void> {
    state.step = "failed";
    await this.save(state);
    await updateSubmission(this.env.DB, state.submissionId, {
      status: "failed",
      updated_at: now(),
    });
    await this.emit(state.submissionId, "failed", reason);
    if (state.judgeRunId) {
      await updateJudgeRun(this.env.DB, state.judgeRunId, {
        error: reason,
        finished_at: now(),
        phase: "failed",
      });
    }
    if (state.currentJudge) {
      await this.releaseSlot(state.submissionId, state.currentJudge);
    }
    if (state.otherJudgeRunId && !state.otherDone) {
      await this.releaseSlot(state.submissionId, "tracks");
    }
  }

  private async emit(submissionId: string, kind: string, message: string): Promise<void> {
    await insertEvent(this.env.DB, {
      submission_id: submissionId,
      kind,
      message,
      at: now(),
    });
    let inUse = 0;
    let queued = 0;
    try {
      const stub = this.env.SCHEDULER.get(this.env.SCHEDULER.idFromName("global"));
      const res = await stub.fetch("https://scheduler/status");
      const slots = (await res.json()) as { inUse?: number; queued?: number };
      inUse = slots.inUse ?? 0;
      queued = slots.queued ?? 0;
    } catch {
      /* status is best-effort */
    }
    await publishWall(this.env, { inUse, queued });
  }
}

function now(): string {
  return new Date().toISOString();
}
