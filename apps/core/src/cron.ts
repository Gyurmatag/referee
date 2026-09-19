import type { CoreEnv } from "./db/queries.js";
import {
  listDeployments,
  listOldSubmissions,
  listRecentJudgeFailures,
  markDeploymentUnhealthy,
  updateEventRow,
} from "./db/queries.js";
import { insertEvent } from "./db/queries.js";
import { isQuotaSignature, retentionCutoff } from "./cron-helpers.js";
import { destroySubmissionSandbox } from "./sandbox/lifecycle.js";

export { isQuotaSignature, retentionCutoff };

const IDLE_MS = 30 * 60_000;

export async function handleCron(env: CoreEnv): Promise<void> {
  const now = new Date();
  const retentionHours = Number(env.RETENTION_HOURS || "20");
  const cutoff = retentionCutoff(now, retentionHours);

  const old = await listOldSubmissions(env.DB, cutoff);
  for (const row of old) {
    try {
      await destroySubmissionSandbox(env, row.id);
      await markDeploymentUnhealthy(env.DB, row.id);
      await insertEvent(env.DB, {
        submission_id: row.id,
        kind: "teardown",
        message: `sandbox destroyed after ${retentionHours}h`,
        at: now.toISOString(),
      });
    } catch {
      // keep going
    }
  }

  const deployments = await listDeployments(env.DB);
  for (const d of deployments) {
    if (!d.healthy) continue;
    const last = Date.parse(d.last_seen_at || "");
    if (!Number.isFinite(last) || now.getTime() - last < IDLE_MS) continue;
    try {
      await destroySubmissionSandbox(env, d.submission_id);
      await markDeploymentUnhealthy(env.DB, d.submission_id);
      await insertEvent(env.DB, {
        submission_id: d.submission_id,
        kind: "teardown",
        message: "idle sandbox destroyed after 30m",
        at: now.toISOString(),
      });
    } catch {
      // keep going
    }
  }

  const since = new Date(now.getTime() - 60_000).toISOString();
  const failures = await listRecentJudgeFailures(env.DB, since);
  const quick = failures.filter((f) => {
    if (!f.finished_at) return false;
    return Date.parse(f.finished_at) - Date.parse(f.started_at) < 60_000;
  });
  if (isQuotaSignature(quick.map((f) => f.error))) {
    await updateEventRow(env.DB, { quota_alert: true });
    await insertEvent(env.DB, {
      submission_id: "",
      kind: "quota",
      message: "quota_alert: three judge failures in under 60s",
      at: now.toISOString(),
    });
  }
}
