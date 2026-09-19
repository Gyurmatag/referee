import type { CoreEnv } from "../db/queries.js";
import { insertIngestToken, getIngestToken } from "../db/queries.js";
import { parseJudgeReport, type JudgeReport, type Phase } from "@referee/shared";
import { NotConfigured, type JudgeInput, type JudgeRunner } from "./types.js";
import { buildWebhookPayload } from "./webhook-session.js";

/** Devin Cloud session on the Referee Outpost. Needs a Sessions API key (apk_). */
export class CloudSessionRunner implements JudgeRunner {
  constructor(private env: CoreEnv) {}

  async start(input: JudgeInput): Promise<{ runId: string }> {
    const apiToken = (this.env.DEVIN_SERVICE_TOKEN || this.env.DEVIN_API_TOKEN || "").trim();
    if (!apiToken) {
      throw new NotConfigured("CloudSessionRunner needs DEVIN_SERVICE_TOKEN or DEVIN_API_TOKEN");
    }
    const publicBase = (this.env.CORE_PUBLIC_URL || "").replace(/\/$/, "");
    if (!publicBase) {
      throw new NotConfigured("CORE_PUBLIC_URL is required for outpost ingest");
    }
    const token = crypto.randomUUID().replace(/-/g, "");
    const payload = buildWebhookPayload(input, {
      report: `${publicBase}/ingest/report/${token}`,
      evidence: `${publicBase}/ingest/evidence/${token}`,
      outpost: this.env.DEVIN_OUTPOST_ID,
    });
    const prompt = [
      `You are a Referee ${input.judge} judge. Run on Outpost ${this.env.DEVIN_OUTPOST_ID || "referee"}.`,
      "Do not implement the team's product. Reconstruct, build, run, and test it.",
      "After every phase change POST the current report JSON to ingest_report_url.",
      "Include session_url on the first POST. Final phase is done or failed.",
      "Input JSON:",
      JSON.stringify(payload),
    ].join("\n");
    const playbookId =
      input.judge === "tracks"
        ? this.env.DEVIN_PLAYBOOK_TRACKS
        : this.env.DEVIN_PLAYBOOK_BUILD;
    const session = await createSession(this.env, apiToken, {
      prompt,
      title: `Referee ${input.judge} ${input.submissionId}`,
      platform: "referee",
      tags: ["referee", input.judge, input.submissionId],
      repos: [input.repo],
      playbook_id: playbookId,
    });
    await insertIngestToken(this.env.DB, {
      token,
      submission_id: input.submissionId,
      judge: input.judge,
      run_id: session.session_id,
      session_url: session.url,
      created_at: new Date().toISOString(),
    });
    return { runId: token };
  }

  async poll(runId: string) {
    const row = await getIngestToken(this.env.DB, runId);
    if (!row) {
      return { phase: "failed" as Phase, logTail: "unknown outpost run", report: null, exited: true };
    }
    const report = await loadLatestReport(this.env.DB, row.submission_id, row.judge);
    const phase = (report?.phase ?? "starting") as Phase;
    return {
      phase,
      logTail: report?.summary || "Waiting for Outpost session",
      sessionUrl: row.session_url || undefined,
      report,
      exited: phase === "done" || phase === "failed",
    };
  }

  async cancel(): Promise<void> {
    /* session lives on the outpost worker */
  }
}

async function createSession(
  env: CoreEnv,
  apiToken: string,
  body: {
    prompt: string;
    title: string;
    platform: string;
    tags: string[];
    repos: string[];
    playbook_id?: string;
  },
): Promise<{ session_id: string; url: string }> {
  const org = (env.DEVIN_ORG_ID || "").trim();
  const service = (env.DEVIN_SERVICE_TOKEN || "").trim();
  const personal = (env.DEVIN_API_TOKEN || "").trim();
  const attempts: { url: string; token: string; payload: Record<string, unknown> }[] = [];
  if (org && service) {
    attempts.push({
      url: `https://api.devin.ai/v3/organizations/${org}/sessions`,
      token: service,
      payload: { ...body, platform: body.platform },
    });
  }
  if (personal) {
    attempts.push({
      url: "https://api.devin.ai/v1/sessions",
      token: personal,
      payload: {
        prompt: body.prompt,
        title: body.title,
        tags: body.tags,
        playbook_id: body.playbook_id,
      },
    });
  }
  if (attempts.length === 0) {
    attempts.push({
      url: "https://api.devin.ai/v1/sessions",
      token: apiToken,
      payload: { prompt: body.prompt, title: body.title, tags: body.tags },
    });
  }
  let last = "no attempt";
  for (const attempt of attempts) {
    const res = await fetch(attempt.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${attempt.token}`,
        "content-type": "application/json",
        "user-agent": "referee-core",
      },
      body: JSON.stringify(attempt.payload),
    });
    if (res.ok) {
      const json = (await res.json()) as { session_id?: string; url?: string };
      if (json.session_id && json.url) {
        return { session_id: json.session_id, url: json.url };
      }
      last = "missing session_id";
      continue;
    }
    last = `${res.status}`;
  }
  throw new Error(`Devin session create ${last}`);
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
