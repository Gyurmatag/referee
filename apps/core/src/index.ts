import { Hono } from "hono";
import { Sandbox } from "@cloudflare/sandbox";
import {
  CreateSubmissionSchema,
  EventSchema,
  OverrideSchema,
  RubricSchema,
  TracksConfigSchema,
  claimsFromTracks,
  parseJudgeReport,
} from "@referee/shared";
import { z } from "zod";
import {
  countRunningJudges,
  countSubmissions,
  findJudgeRun,
  getEvent,
  getIngestToken,
  getSubmission,
  importGuests,
  insertEvent,
  insertSubmission,
  listOverrides,
  listSubmissions,
  updateEventRow,
  updateJudgeRun,
  updateSubmission,
  updateUserName,
  upsertOverride,
  upsertUser,
  getUserByLogin,
  type CoreEnv,
} from "./db/queries.js";
import { handleCron } from "./cron.js";
import { SubmissionDO } from "./do/submission.js";
import { JudgeScheduler } from "./do/scheduler.js";
import { parseGuestCsv } from "./luma/event.js";
import { fetchLumaEvent } from "./luma/event.js";
import { recordSessionUrl } from "./runner/webhook-session.js";
import { evidenceKey, guessContentType, putBytes, putText } from "./sandbox/evidence.js";
import { roleColumn, rolesForLogin } from "./roles.js";
import { WallHub } from "./do/wall.js";
import { assembleWall, publishWall } from "./wall-publish.js";
import { publicEventFrom } from "./wall.js";
import { fetchOutpostStatus } from "./outpost.js";

export { SubmissionDO, JudgeScheduler, Sandbox, WallHub };

type AppEnv = { Bindings: CoreEnv };

const app = new Hono<AppEnv>();

function requireInternal(c: { req: { header: (n: string) => string | undefined }; env: CoreEnv }) {
  const key = c.req.header("x-internal-key");
  return Boolean(c.env.INTERNAL_API_KEY && key === c.env.INTERNAL_API_KEY);
}

async function schedulerStatus(env: CoreEnv) {
  try {
    const stub = env.SCHEDULER.get(env.SCHEDULER.idFromName("global"));
    const res = await stub.fetch("https://scheduler/status");
    return (await res.json()) as { inUse: number; queued: number };
  } catch {
    return { inUse: 0, queued: 0 };
  }
}

function submissionStub(env: CoreEnv, id: string) {
  return env.SUBMISSION.get(env.SUBMISSION.idFromName(id));
}

app.get("/health", (c) => c.json({ ok: true, service: "referee-core" }));

app.get("/outpost", async (c) => {
  return c.json(await fetchOutpostStatus(c.env));
});

app.get("/event", async (c) => {
  const event = await getEvent(c.env.DB);
  const [submissions, judges_running] = await Promise.all([
    countSubmissions(c.env.DB),
    countRunningJudges(c.env.DB),
  ]);
  return c.json(
    publicEventFrom({
      ...event,
      submissions,
      judges_running,
    }),
  );
});

app.post("/users/me", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      github_login: z.string().min(1),
      github_id: z.number().int().optional(),
      name: z.string().optional(),
      avatar_url: z.string().optional(),
      luma_email: z.string().email().optional(),
    })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid user" }, 400);
  const id = c.req.header("x-user-id") || `user_${parsed.data.github_login}`;
  const role = roleColumn(parsed.data.github_login, c.env.ORGANIZER_LOGINS);
  const result = await upsertUser(c.env.DB, { id, ...parsed.data, role });
  const stored = await getUserByLogin(c.env.DB, parsed.data.github_login);
  return c.json({
    id,
    name: stored?.name ?? parsed.data.name ?? null,
    luma_email: parsed.data.luma_email ?? null,
    luma_verified: result.verified,
    role,
    roles: rolesForLogin(parsed.data.github_login, c.env.ORGANIZER_LOGINS),
  });
});

app.patch("/users/me", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const login = c.req.header("x-user-id") || "";
  const body = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(await c.req.json().catch(() => ({})));
  if (!login || !body.success) return c.json({ error: "invalid name" }, 400);
  await updateUserName(c.env.DB, login, body.data.name);
  const stored = await getUserByLogin(c.env.DB, login);
  if (!stored) return c.json({ error: "not found" }, 404);
  return c.json({ login: stored.github_login, name: stored.name });
});

app.post("/submissions", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "invalid submission" }, 400);
  }
  const id = `sub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const created_at = new Date().toISOString();
  const event = await getEvent(c.env.DB);
  const claims =
    parsed.data.claims.length > 0
      ? parsed.data.claims
      : claimsFromTracks(event.tracks).map((row) => ({ claim: row.claim }));
  if (claims.length === 0) {
    return c.json({ error: "event has no claims" }, 400);
  }
  await insertSubmission(c.env.DB, {
    id,
    user_id: c.req.header("x-user-id") ?? "",
    team_name: parsed.data.team_name,
    repo_url: parsed.data.repo_url.replace(/\.git$/, "").replace(/\/$/, ""),
    live_url: parsed.data.live_url || null,
    claims,
    run_hints: parsed.data.run_hints,
    devin_links: parsed.data.devin_links,
    display_consent: parsed.data.display_consent,
    created_at,
  });
  await insertEvent(c.env.DB, {
    submission_id: id,
    kind: "submitted",
    message: `${parsed.data.team_name} submitted`,
    at: created_at,
  });
  await submissionStub(c.env, id).fetch(
    new Request("https://submission/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }),
  );
  const submission = await getSubmission(c.env.DB, id);
  await publishWall(c.env, await schedulerStatus(c.env));
  return c.json(submission, 201);
});

app.get("/submissions/:id", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const submission = await getSubmission(c.env.DB, c.req.param("id"));
  if (!submission) return c.json({ error: "not found" }, 404);
  return c.json(submission);
});

app.post("/submissions/:id/rejudge", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const submission = await getSubmission(c.env.DB, id);
  if (!submission) return c.json({ error: "not found" }, 404);
  await updateSubmission(c.env.DB, id, { status: "queued", updated_at: new Date().toISOString() });
  await submissionStub(c.env, id).fetch(
    new Request("https://submission/rejudge", { method: "POST" }),
  );
  return c.json(await getSubmission(c.env.DB, id));
});

app.post("/submissions/:id/review", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const submission = await getSubmission(c.env.DB, id);
  if (!submission) return c.json({ error: "not found" }, 404);
  await submissionStub(c.env, id).fetch(
    new Request("https://submission/review-now", { method: "POST" }),
  );
  return c.json(await getSubmission(c.env.DB, id));
});

app.post("/submissions/:id/appeal", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  const submission = await getSubmission(c.env.DB, id);
  if (!submission) return c.json({ error: "not found" }, 404);
  const body = z.object({ hints: z.string().default("") }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "invalid appeal" }, 400);
  await updateSubmission(c.env.DB, id, {
    status: "appealed",
    updated_at: new Date().toISOString(),
  });
  await submissionStub(c.env, id).fetch(
    new Request("https://submission/appeal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hints: body.data.hints }),
    }),
  );
  return c.json(await getSubmission(c.env.DB, id));
});

app.get("/wall", async (c) => {
  return c.json(await assembleWall(c.env, await schedulerStatus(c.env)));
});

app.get("/wall/ws", (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("expected websocket", 426);
  }
  if (!c.env.WALL) return c.text("wall unavailable", 503);
  const stub = c.env.WALL.get(c.env.WALL.idFromName("global"));
  return stub.fetch(c.req.raw);
});

app.post("/ingest/report/:token", async (c) => {
  const token = c.req.param("token");
  const row = await getIngestToken(c.env.DB, token);
  if (!row) return c.json({ error: "invalid token" }, 401);
  const body = await c.req.json().catch(() => null);
  const sessionUrl =
    body && typeof body === "object" && "session_url" in body
      ? String((body as { session_url?: string }).session_url ?? "")
      : "";
  const parsed = parseJudgeReport(body);
  if (!parsed.report) return c.json({ error: parsed.error ?? "invalid report" }, 400);
  const run = await findJudgeRun(c.env.DB, row.submission_id, row.judge);
  if (run) {
    await updateJudgeRun(c.env.DB, run.id, {
      phase: parsed.report.phase,
      report: parsed.report,
      log_tail: parsed.report.summary,
      session_url: sessionUrl,
      finished_at:
        parsed.report.phase === "done" || parsed.report.phase === "failed"
          ? new Date().toISOString()
          : null,
      error: parsed.report.phase === "failed" ? parsed.report.summary : null,
    });
  }
  if (sessionUrl) {
    await recordSessionUrl(c.env, token, sessionUrl, run?.id);
  }
  await putText(
    c.env.EVIDENCE,
    evidenceKey(row.submission_id, row.judge, "report.json"),
    JSON.stringify(parsed.report),
  );
  return c.json({ ok: true, phase: parsed.report.phase });
});

app.post("/ingest/evidence/:token", async (c) => {
  const token = c.req.param("token");
  const row = await getIngestToken(c.env.DB, token);
  if (!row) return c.json({ error: "invalid token" }, 401);
  const form = await c.req.formData();
  const file = form.get("file");
  const name = String(form.get("name") || (file instanceof File ? file.name : "evidence.bin"));
  if (!(file instanceof File)) return c.json({ error: "file required" }, 400);
  const key = evidenceKey(row.submission_id, row.judge, `evidence/${name.replace(/^\/+/, "")}`);
  await putBytes(c.env.EVIDENCE, key, await file.arrayBuffer(), guessContentType(name));
  return c.json({ ok: true, key });
});

app.get("/evidence", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const key = c.req.query("key") ?? "";
  if (!key.startsWith("submissions/")) return c.json({ error: "invalid key" }, 400);
  const obj = await c.env.EVIDENCE.get(key);
  if (!obj) return c.json({ error: "not found" }, 404);
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || guessContentType(key),
    },
  });
});

app.get("/org/leaderboard", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const event = await getEvent(c.env.DB);
  const submissions = await listSubmissions(c.env.DB);
  const overrides = await listOverrides(c.env.DB);
  return c.json({
    reveal_scores: event.reveal_scores,
    rubric: event.rubric,
    tracks: event.tracks,
    overrides,
    rows: submissions.map((submission) => ({
      submission,
      scorecard: submission.score,
    })),
  });
});

app.put("/org/rubric", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = RubricSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid rubric" }, 400);
  await updateEventRow(c.env.DB, { rubric_json: JSON.stringify(parsed.data) });
  return c.json(parsed.data);
});

app.put("/org/event", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = EventSchema.partial()
    .omit({ id: true })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid event" }, 400);
  await updateEventRow(c.env.DB, parsed.data);
  return c.json(await getEvent(c.env.DB));
});

app.put("/org/tracks", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = TracksConfigSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid tracks" }, 400);
  await updateEventRow(c.env.DB, { tracks_json: JSON.stringify(parsed.data) });
  return c.json(parsed.data);
});

app.post("/org/guests/import", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const text = await c.req.text();
  const rows = parseGuestCsv(text);
  const count = await importGuests(c.env.DB, rows);
  return c.json({ imported: count });
});

app.put("/org/overrides/:id", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = OverrideSchema.omit({ submission_id: true, at: true })
    .extend({
      dimension: z.string(),
      value: z.number(),
      note: z.string().default(""),
      by_user: z.string().default(""),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid override" }, 400);
  const row = {
    submission_id: c.req.param("id"),
    dimension: parsed.data.dimension,
    value: parsed.data.value,
    note: parsed.data.note,
    by_user: parsed.data.by_user || c.req.header("x-user-id") || "",
    at: new Date().toISOString(),
  };
  await upsertOverride(c.env.DB, row);
  return c.json(row);
});

app.put("/org/reveal", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = z
    .object({ reveal_scores: z.boolean() })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid reveal" }, 400);
  await updateEventRow(c.env.DB, { reveal_scores: parsed.data.reveal_scores });
  return c.json(parsed.data);
});

app.post("/org/bump", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = z
    .object({ submissionId: z.string() })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid bump" }, 400);
  const stub = c.env.SCHEDULER.get(c.env.SCHEDULER.idFromName("global"));
  const res = await stub.fetch("https://scheduler/bump", {
    method: "POST",
    body: JSON.stringify({ submissionId: parsed.data.submissionId, judge: "" }),
  });
  return c.json(await res.json());
});

app.post("/org/luma/sync", async (c) => {
  if (!requireInternal(c)) return c.json({ error: "unauthorized" }, 401);
  const parsed = z.object({ luma_url: z.string().url() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid luma url" }, 400);
  const luma = await fetchLumaEvent(parsed.data.luma_url);
  await updateEventRow(c.env.DB, {
    luma_url: parsed.data.luma_url,
    title: luma.title,
    starts_at: luma.starts_at || undefined,
    ends_at: luma.ends_at || undefined,
    window_start: luma.starts_at || undefined,
    window_end: luma.ends_at || undefined,
  });
  return c.json(luma);
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: CoreEnv, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },
};
