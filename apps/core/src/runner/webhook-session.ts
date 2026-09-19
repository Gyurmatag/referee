import { parseJudgeReport, type JudgeReport, type Phase } from "@referee/shared";
import type { CoreEnv } from "../db/queries.js";
import {
  getIngestToken,
  insertIngestToken,
  updateIngestToken,
  updateJudgeRun,
} from "../db/queries.js";
import { NotConfigured, type JudgeInput, type JudgeRunner } from "./types.js";

export type WebhookPayload = {
  test?: boolean;
  submission_id: string;
  judge: "build_e2e" | "tracks";
  repo: string;
  sha: string;
  claims: { claim: string }[];
  run_hints: string;
  tracks: unknown;
  window: { start: string; end: string };
  hints: string;
  live_url: string;
  ingest_report_url: string;
  ingest_evidence_url: string;
  outpost?: string;
};

export function buildWebhookPayload(input: JudgeInput, urls: {
  report: string;
  evidence: string;
  outpost?: string;
}): WebhookPayload {
  return {
    submission_id: input.submissionId,
    judge: input.judge,
    repo: input.repo,
    sha: input.sha,
    claims: input.claims,
    run_hints: input.runHints,
    tracks: input.tracks,
    window: input.window,
    hints: input.hints,
    live_url: input.liveUrl ?? "",
    ingest_report_url: urls.report,
    ingest_evidence_url: urls.evidence,
    outpost: urls.outpost,
  };
}

export function webhookConfig(env: CoreEnv, judge: "build_e2e" | "tracks") {
  const url =
    judge === "tracks" ? env.DEVIN_WEBHOOK_TRACKS_URL : env.DEVIN_WEBHOOK_BUILD_URL;
  const secret =
    judge === "tracks" ? env.DEVIN_WEBHOOK_TRACKS_SECRET : env.DEVIN_WEBHOOK_BUILD_SECRET;
  return { url: url?.trim() || "", secret: secret?.trim() || "" };
}

export class WebhookSessionRunner implements JudgeRunner {
  constructor(private env: CoreEnv) {}

  async start(input: JudgeInput): Promise<{ runId: string }> {
    const { url, secret } = webhookConfig(this.env, input.judge);
    if (!url || !secret) {
      throw new NotConfigured(`WebhookSessionRunner missing URL/secret for ${input.judge}`);
    }
    const publicBase = (this.env.CORE_PUBLIC_URL || "").replace(/\/$/, "");
    if (!publicBase) {
      throw new NotConfigured("CORE_PUBLIC_URL is required for webhook ingest");
    }
    const token = crypto.randomUUID().replace(/-/g, "");
    const payload = buildWebhookPayload(input, {
      report: `${publicBase}/ingest/report/${token}`,
      evidence: `${publicBase}/ingest/evidence/${token}`,
      outpost: this.env.DEVIN_OUTPOST_ID,
    });
    await insertIngestToken(this.env.DB, {
      token,
      submission_id: input.submissionId,
      judge: input.judge,
      run_id: token,
      session_url: "",
      created_at: new Date().toISOString(),
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Webhook-Secret": secret,
        "user-agent": "referee-webhook/1.0",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Devin webhook ${res.status}`);
    }
    return { runId: token };
  }

  async poll(runId: string) {
    const row = await getIngestToken(this.env.DB, runId);
    if (!row) {
      return { phase: "failed" as Phase, logTail: "unknown webhook run", report: null, exited: true };
    }
    const report = await loadLatestReport(this.env.DB, row.submission_id, row.judge);
    const phase = (report?.phase ?? "starting") as Phase;
    return {
      phase,
      logTail: report?.summary || "Waiting for Devin session ingest",
      sessionUrl: row.session_url || undefined,
      report,
      exited: phase === "done" || phase === "failed",
    };
  }

  async cancel(runId: string): Promise<void> {
    await updateIngestToken(this.env.DB, runId, { session_url: "" });
  }
}

async function loadLatestReport(
  db: D1Database,
  submissionId: string,
  judge: string,
): Promise<JudgeReport | null> {
  const row = await db
    .prepare(
      `SELECT report_json FROM judge_runs
       WHERE submission_id = ? AND judge = ? ORDER BY started_at DESC LIMIT 1`,
    )
    .bind(submissionId, judge)
    .first<{ report_json: string | null }>();
  if (!row?.report_json) return null;
  try {
    return parseJudgeReport(JSON.parse(row.report_json)).report;
  } catch {
    return null;
  }
}

export async function recordSessionUrl(
  env: CoreEnv,
  token: string,
  sessionUrl: string,
  judgeRunId?: string,
): Promise<void> {
  await updateIngestToken(env.DB, token, { session_url: sessionUrl });
  if (judgeRunId) {
    await updateJudgeRun(env.DB, judgeRunId, { session_url: sessionUrl });
  }
}
