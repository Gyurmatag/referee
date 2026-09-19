import {
  DEFAULT_RUBRIC,
  DEFAULT_TRACKS,
  TracksConfigSchema,
  DeploymentSchema,
  JudgeRunSchema,
  ProvenanceSchema,
  OverrideSchema,
  ReviewSchema,
  ScorecardSchema,
  SubmissionSchema,
  type Deployment,
  type JudgeRun,
  type Provenance,
  type Review,
  type Scorecard,
  type Submission,
} from "@referee/shared";

export type CoreEnv = {
  DB: D1Database;
  EVIDENCE: R2Bucket;
  SUBMISSION: DurableObjectNamespace;
  SCHEDULER: DurableObjectNamespace;
  Sandbox?: DurableObjectNamespace;
  INTERNAL_API_KEY: string;
  DEVIN_CREDENTIALS_TOML?: string;
  GITHUB_TOKEN?: string;
  LUMA_API_KEY?: string;
  REFEREE_GITHUB_ORG: string;
  DEVIN_MODEL: string;
  MAX_CONCURRENT_JUDGES: string;
  JUDGE_TIME_LIMIT_MIN: string;
  JUDGE_PARALLEL: string;
  RETENTION_HOURS: string;
  JUDGE_RUNNER_BUILD_E2E: string;
  JUDGE_RUNNER_TRACKS: string;
  TUNNEL_HOSTNAME?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  WORKERS_DEV_SUBDOMAIN?: string;
  CORE_PUBLIC_URL?: string;
  DEVIN_WEBHOOK_BUILD_URL?: string;
  DEVIN_WEBHOOK_BUILD_SECRET?: string;
  DEVIN_WEBHOOK_TRACKS_URL?: string;
  DEVIN_WEBHOOK_TRACKS_SECRET?: string;
  DEVIN_OUTPOST_ID?: string;
  DEVIN_OUTPOSTS_TOKEN?: string;
  DEVIN_API_TOKEN?: string;
  DEVIN_SERVICE_TOKEN?: string;
  DEVIN_ORG_ID?: string;
  WALL?: DurableObjectNamespace;
  ORGANIZER_LOGINS?: string;
};

type EventRow = {
  id: string;
  luma_url: string;
  title: string;
  city?: string | null;
  venue?: string | null;
  starts_at: string;
  ends_at: string;
  window_start: string;
  window_end: string;
  rubric_json: string;
  tracks_json: string;
  reveal_scores: number;
  quota_alert: number;
};

export function normalizeEventId(raw: string | undefined | null): string {
  const id = (raw ?? "default").trim();
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id) ? id : "default";
}

function parseEventRow(row: EventRow) {
  let rubric = DEFAULT_RUBRIC;
  let tracks = DEFAULT_TRACKS;
  try {
    if (row.rubric_json && row.rubric_json !== "{}") {
      rubric = JSON.parse(row.rubric_json) as typeof DEFAULT_RUBRIC;
    }
  } catch {
    rubric = DEFAULT_RUBRIC;
  }
  try {
    if (row.tracks_json && row.tracks_json !== "{}") {
      const parsed = TracksConfigSchema.safeParse(JSON.parse(row.tracks_json));
      if (parsed.success && parsed.data.tracks.length > 0) tracks = parsed.data;
    }
  } catch {
    tracks = DEFAULT_TRACKS;
  }
  return {
    id: row.id,
    luma_url: row.luma_url ?? "",
    title: row.title || "Event",
    city: row.city ?? "",
    venue: row.venue ?? "",
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    window_start: row.window_start,
    window_end: row.window_end,
    reveal_scores: row.reveal_scores === 1,
    quota_alert: row.quota_alert === 1,
    rubric,
    tracks,
  };
}

export async function getEvent(db: D1Database, id = "default") {
  const eventId = normalizeEventId(id);
  const row = await db.prepare("SELECT * FROM event WHERE id = ?").bind(eventId).first<EventRow>();
  if (!row) {
    return parseEventRow({
      id: eventId,
      luma_url: "",
      title: "Event",
      city: "",
      venue: "",
      starts_at: "2026-09-19T07:00:00.000Z",
      ends_at: "2026-09-20T16:00:00.000Z",
      window_start: "2026-09-19T07:00:00.000Z",
      window_end: "2026-09-20T16:00:00.000Z",
      rubric_json: "{}",
      tracks_json: "{}",
      reveal_scores: 0,
      quota_alert: 0,
    });
  }
  return parseEventRow(row);
}

export async function listEvents(db: D1Database) {
  const rows = await db.prepare("SELECT * FROM event ORDER BY starts_at DESC").all<EventRow>();
  const events = (rows.results ?? []).map(parseEventRow);
  if (events.length === 0) return [await getEvent(db)];
  return events;
}

export async function upsertUser(
  db: D1Database,
  user: {
    id: string;
    github_login: string;
    github_id?: number;
    name?: string;
    avatar_url?: string;
    luma_email?: string;
    role?: string;
  },
) {
  const now = new Date().toISOString();
  const verified = user.luma_email ? await guestExists(db, user.luma_email) : false;
  const role = user.role ?? "participant";
  await db
    .prepare(
      `INSERT INTO users (id, github_login, github_id, name, avatar_url, luma_email, luma_verified, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(github_login) DO UPDATE SET
         name = COALESCE(users.name, excluded.name),
         avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
         luma_email = COALESCE(excluded.luma_email, users.luma_email),
         luma_verified = excluded.luma_verified,
         role = excluded.role`,
    )
    .bind(
      user.id,
      user.github_login,
      user.github_id ?? null,
      user.name ?? null,
      user.avatar_url ?? null,
      user.luma_email ?? null,
      verified ? 1 : 0,
      role,
      now,
    )
    .run();
  return { verified, role };
}

export async function getUserByLogin(db: D1Database, login: string) {
  return db
    .prepare("SELECT id, github_login, name, avatar_url, role FROM users WHERE github_login = ?")
    .bind(login)
    .first<{ id: string; github_login: string; name: string | null; avatar_url: string | null; role: string }>();
}

export async function updateUserName(db: D1Database, login: string, name: string) {
  await db.prepare("UPDATE users SET name = ? WHERE github_login = ?").bind(name, login).run();
}

export async function insertSubmission(
  db: D1Database,
  row: {
    id: string;
    event_id: string;
    user_id: string;
    team_name: string;
    repo_url: string;
    live_url: string | null;
    claims: { claim: string }[];
    run_hints: string;
    devin_links: string[];
    display_consent: boolean;
    created_at: string;
  },
) {
  await db
    .prepare(
      `INSERT INTO submissions (
        id, event_id, user_id, team_name, repo_url, live_url, claims_json, run_hints,
        devin_links_json, display_consent, head_sha, status, confidence, score_json,
        created_at, updated_at, queue_position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'queued', NULL, NULL, ?, ?, NULL)`,
    )
    .bind(
      row.id,
      row.event_id,
      row.user_id,
      row.team_name,
      row.repo_url,
      row.live_url,
      JSON.stringify(row.claims),
      row.run_hints,
      JSON.stringify(row.devin_links),
      row.display_consent ? 1 : 0,
      row.created_at,
      row.created_at,
    )
    .run();
}

export async function updateSubmission(
  db: D1Database,
  id: string,
  patch: {
    status?: string;
    head_sha?: string;
    confidence?: number | null;
    score?: Scorecard | null;
    queue_position?: number | null;
    updated_at: string;
  },
) {
  const current = await db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!current) return;
  await db
    .prepare(
      `UPDATE submissions SET status = ?, head_sha = ?, confidence = ?, score_json = ?,
       queue_position = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(
      patch.status ?? current.status,
      patch.head_sha ?? current.head_sha,
      patch.confidence === undefined ? current.confidence : patch.confidence,
      patch.score === undefined
        ? current.score_json
        : patch.score
          ? JSON.stringify(patch.score)
          : null,
      patch.queue_position === undefined ? current.queue_position : patch.queue_position,
      patch.updated_at,
      id,
    )
    .run();
}

export async function upsertProvenance(db: D1Database, submissionId: string, p: Provenance) {
  await db
    .prepare(
      `INSERT INTO provenance (
        submission_id, repo_created_at, is_fork, parent_repo, commits_json,
        in_window_ratio, bot_commit_ratio, coauthor_devin_ratio, devin_prs, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(submission_id) DO UPDATE SET
        repo_created_at = excluded.repo_created_at,
        is_fork = excluded.is_fork,
        parent_repo = excluded.parent_repo,
        commits_json = excluded.commits_json,
        in_window_ratio = excluded.in_window_ratio,
        bot_commit_ratio = excluded.bot_commit_ratio,
        coauthor_devin_ratio = excluded.coauthor_devin_ratio,
        devin_prs = excluded.devin_prs,
        notes = excluded.notes`,
    )
    .bind(
      submissionId,
      p.repo_created_at,
      p.is_fork ? 1 : 0,
      p.parent_repo,
      JSON.stringify(p.commits),
      p.in_window_ratio,
      p.bot_commit_ratio,
      p.coauthor_devin_ratio,
      p.devin_prs,
      p.notes,
    )
    .run();
}

export async function insertJudgeRun(db: D1Database, run: JudgeRun) {
  await db
    .prepare(
      `INSERT INTO judge_runs (
        id, submission_id, judge, runner, phase, log_tail, report_json,
        transcript_key, session_url, started_at, finished_at, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      run.id,
      run.submission_id,
      run.judge,
      run.runner,
      run.phase,
      run.log_tail,
      run.report ? JSON.stringify(run.report) : null,
      run.transcript_key,
      run.session_url ?? "",
      run.started_at,
      run.finished_at,
      run.error,
    )
    .run();
}

export async function updateJudgeRun(
  db: D1Database,
  id: string,
  patch: Partial<
    Pick<
      JudgeRun,
      "phase" | "log_tail" | "report" | "transcript_key" | "session_url" | "finished_at" | "error"
    >
  >,
) {
  const current = await db
    .prepare("SELECT * FROM judge_runs WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!current) return;
  await db
    .prepare(
      `UPDATE judge_runs SET phase = ?, log_tail = ?, report_json = ?, transcript_key = ?,
       session_url = ?, finished_at = ?, error = ? WHERE id = ?`,
    )
    .bind(
      patch.phase ?? current.phase,
      patch.log_tail ?? current.log_tail,
      patch.report === undefined
        ? current.report_json
        : patch.report
          ? JSON.stringify(patch.report)
          : null,
      patch.transcript_key === undefined ? current.transcript_key : patch.transcript_key,
      patch.session_url === undefined ? current.session_url : patch.session_url,
      patch.finished_at === undefined ? current.finished_at : patch.finished_at,
      patch.error === undefined ? current.error : patch.error,
      id,
    )
    .run();
}

export async function insertEvent(
  db: D1Database,
  row: { submission_id: string; kind: string; message: string; at: string },
) {
  await db
    .prepare("INSERT INTO events (submission_id, kind, message, at) VALUES (?, ?, ?, ?)")
    .bind(row.submission_id, row.kind, row.message, row.at)
    .run();
}

export async function countSubmissions(db: D1Database, eventId?: string): Promise<number> {
  if (eventId) {
    const row = await db
      .prepare("SELECT COUNT(*) as n FROM submissions WHERE COALESCE(event_id, 'default') = ?")
      .bind(eventId)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }
  const row = await db.prepare("SELECT COUNT(*) as n FROM submissions").first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countSubmissionsByEvent(db: D1Database): Promise<Record<string, number>> {
  const rows = await db
    .prepare("SELECT COALESCE(event_id, 'default') as event_id, COUNT(*) as n FROM submissions GROUP BY event_id")
    .all<{ event_id: string; n: number }>();
  return Object.fromEntries((rows.results ?? []).map((row) => [row.event_id, row.n]));
}

export async function countRunningJudges(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as n FROM judge_runs
       WHERE phase NOT IN ('done', 'failed') AND finished_at IS NULL`,
    )
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getSubmission(db: D1Database, id: string): Promise<Submission | null> {
  const row = await db
    .prepare("SELECT * FROM submissions WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      event_id?: string | null;
      user_id: string;
      team_name: string;
      repo_url: string;
      live_url: string | null;
      claims_json: string;
      run_hints: string;
      devin_links_json: string;
      display_consent: number;
      head_sha: string;
      status: string;
      confidence: number | null;
      score_json: string | null;
      external_verdict_json: string | null;
      queue_position: number | null;
      created_at: string;
      updated_at: string;
    }>();
  if (!row) return null;

  const runs = await db
    .prepare("SELECT * FROM judge_runs WHERE submission_id = ? ORDER BY started_at")
    .bind(id)
    .all<{
      id: string;
      submission_id: string;
      judge: string;
      runner: string;
      phase: string;
      log_tail: string;
      report_json: string | null;
      transcript_key: string | null;
      session_url: string | null;
      started_at: string;
      finished_at: string | null;
      error: string | null;
    }>();

  const prov = await db
    .prepare("SELECT * FROM provenance WHERE submission_id = ?")
    .bind(id)
    .first<{
      repo_created_at: string;
      is_fork: number;
      parent_repo: string | null;
      commits_json: string;
      in_window_ratio: number;
      bot_commit_ratio: number;
      coauthor_devin_ratio: number;
      devin_prs: number;
      notes: string;
    }>();

  const deploy = await db
    .prepare("SELECT * FROM deployments WHERE submission_id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  const review = await db
    .prepare("SELECT * FROM reviews WHERE submission_id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  let score: Scorecard | null = null;
  if (row.score_json) {
    const parsed = ScorecardSchema.safeParse(JSON.parse(row.score_json));
    if (parsed.success) score = parsed.data;
  }

  const judge_runs: JudgeRun[] = (runs.results ?? []).map((r) =>
    JudgeRunSchema.parse({
      id: r.id,
      submission_id: r.submission_id,
      judge: r.judge,
      runner: r.runner,
      phase: r.phase,
      log_tail: r.log_tail ?? "",
      report: r.report_json ? JSON.parse(r.report_json) : null,
      transcript_key: r.transcript_key,
      session_url: r.session_url ?? "",
      started_at: r.started_at,
      finished_at: r.finished_at,
      error: r.error,
    }),
  );

  let provenance: Provenance | null = null;
  if (prov) {
    provenance = ProvenanceSchema.parse({
      repo_created_at: prov.repo_created_at,
      is_fork: prov.is_fork === 1,
      parent_repo: prov.parent_repo,
      commits: JSON.parse(prov.commits_json || "[]"),
      in_window_ratio: prov.in_window_ratio,
      bot_commit_ratio: prov.bot_commit_ratio,
      coauthor_devin_ratio: prov.coauthor_devin_ratio,
      devin_prs: prov.devin_prs,
      notes: prov.notes,
    });
  }

  let deployment: Deployment | null = null;
  if (deploy) {
    const parsed = DeploymentSchema.safeParse({
      ...deploy,
      healthy: deploy.healthy === 1,
    });
    if (parsed.success) deployment = parsed.data;
  }

  let reviewRow: Review | null = null;
  if (review) {
    const parsed = ReviewSchema.safeParse({
      fork_repo: review.fork_repo ?? "",
      pr_url: review.pr_url ?? "",
      review_url: review.review_url ?? "",
      summary: review.summary ?? "",
      summary_score: Number(review.summary_score ?? 0),
      screenshots: (() => {
        try {
          const parsed = JSON.parse(String(review.screenshots_json || "[]"));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })(),
    });
    if (parsed.success) reviewRow = parsed.data;
  }

  return SubmissionSchema.parse({
    id: row.id,
    event_id: row.event_id || "default",
    user_id: row.user_id,
    team_name: row.team_name,
    repo_url: row.repo_url,
    live_url: row.live_url,
    claims: JSON.parse(row.claims_json || "[]"),
    run_hints: row.run_hints ?? "",
    devin_links: JSON.parse(row.devin_links_json || "[]"),
    display_consent: row.display_consent === 1,
    head_sha: row.head_sha ?? "",
    status: row.status,
    confidence: row.confidence,
    score,
    queue_position: row.queue_position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    judge_runs,
    provenance,
    deployment,
    review: reviewRow,
    external_verdict: row.external_verdict_json
      ? JSON.parse(row.external_verdict_json)
      : null,
  });
}

export async function listSubmissionIds(
  db: D1Database,
  opts?: { consented?: boolean; eventId?: string },
): Promise<string[]> {
  const clauses: string[] = [];
  const binds: string[] = [];
  if (opts?.consented) clauses.push("display_consent = 1");
  if (opts?.eventId) {
    clauses.push("COALESCE(event_id, 'default') = ?");
    binds.push(opts.eventId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await db
    .prepare(`SELECT id FROM submissions ${where} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<{ id: string }>();
  return (rows.results ?? []).map((r) => r.id);
}

export async function listSubmissions(
  db: D1Database,
  opts?: { consented?: boolean; eventId?: string },
): Promise<Submission[]> {
  const ids = await listSubmissionIds(db, opts);
  const out: Submission[] = [];
  for (const id of ids) {
    const row = await getSubmission(db, id);
    if (row) out.push(row);
  }
  return out;
}

export async function listRecentEvents(db: D1Database, limit = 50, eventId?: string) {
  if (eventId) {
    const rows = await db
      .prepare(
        `SELECT e.id, e.submission_id, e.kind, e.message, e.at
         FROM events e
         WHERE e.submission_id IN (
           SELECT id FROM submissions WHERE COALESCE(event_id, 'default') = ?
         )
         ORDER BY e.id DESC LIMIT ?`,
      )
      .bind(eventId, limit)
      .all<{ id: number; submission_id: string; kind: string; message: string; at: string }>();
    return rows.results ?? [];
  }
  const rows = await db
    .prepare("SELECT id, submission_id, kind, message, at FROM events ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<{ id: number; submission_id: string; kind: string; message: string; at: string }>();
  return rows.results ?? [];
}

export async function upsertDeployment(db: D1Database, submissionId: string, d: Deployment) {
  await db
    .prepare(
      `INSERT INTO deployments (
        submission_id, method, url, sandbox_url, sandbox_id, port, healthy, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(submission_id) DO UPDATE SET
        method = excluded.method,
        url = excluded.url,
        sandbox_url = excluded.sandbox_url,
        sandbox_id = excluded.sandbox_id,
        port = excluded.port,
        healthy = excluded.healthy,
        last_seen_at = excluded.last_seen_at`,
    )
    .bind(
      submissionId,
      d.method,
      d.url,
      d.sandbox_url,
      d.sandbox_id,
      d.port,
      d.healthy ? 1 : 0,
      d.last_seen_at,
    )
    .run();
}

export async function upsertReview(db: D1Database, submissionId: string, r: Review) {
  await db
    .prepare(
      `INSERT INTO reviews (submission_id, fork_repo, pr_url, review_url, summary, summary_score, screenshots_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(submission_id) DO UPDATE SET
         fork_repo = excluded.fork_repo,
         pr_url = excluded.pr_url,
         review_url = excluded.review_url,
         summary = excluded.summary,
         summary_score = excluded.summary_score,
         screenshots_json = excluded.screenshots_json`,
    )
    .bind(
      submissionId,
      r.fork_repo,
      r.pr_url,
      r.review_url,
      r.summary,
      r.summary_score,
      JSON.stringify(r.screenshots ?? []),
    )
    .run();
}

export async function listOverrides(db: D1Database, submissionId?: string) {
  const rows = submissionId
    ? await db
        .prepare("SELECT * FROM overrides WHERE submission_id = ?")
        .bind(submissionId)
        .all<{
          submission_id: string;
          dimension: string;
          value: number;
          note: string;
          by_user: string;
          at: string;
        }>()
    : await db
        .prepare("SELECT * FROM overrides")
        .all<{
          submission_id: string;
          dimension: string;
          value: number;
          note: string;
          by_user: string;
          at: string;
        }>();
  return (rows.results ?? []).map((r) =>
    OverrideSchema.parse({
      submission_id: r.submission_id,
      dimension: r.dimension,
      value: r.value,
      note: r.note ?? "",
      by_user: r.by_user ?? "",
      at: r.at,
    }),
  );
}

export async function upsertOverride(
  db: D1Database,
  row: {
    submission_id: string;
    dimension: string;
    value: number;
    note: string;
    by_user: string;
    at: string;
  },
) {
  await db
    .prepare("DELETE FROM overrides WHERE submission_id = ? AND dimension = ?")
    .bind(row.submission_id, row.dimension)
    .run();
  await db
    .prepare(
      `INSERT INTO overrides (submission_id, dimension, value, note, by_user, at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(row.submission_id, row.dimension, row.value, row.note, row.by_user, row.at)
    .run();
}

export async function updateEventRow(
  db: D1Database,
  patch: {
    title?: string;
    luma_url?: string;
    city?: string;
    venue?: string;
    starts_at?: string;
    ends_at?: string;
    window_start?: string;
    window_end?: string;
    rubric_json?: string;
    tracks_json?: string;
    reveal_scores?: boolean;
    quota_alert?: boolean;
  },
  eventId = "default",
) {
  const id = normalizeEventId(eventId);
  const current = await getEvent(db, id);
  await db
    .prepare(
      `INSERT INTO event (
        id, luma_url, title, city, venue, starts_at, ends_at, window_start, window_end,
        rubric_json, tracks_json, reveal_scores, quota_alert
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        luma_url = excluded.luma_url,
        title = excluded.title,
        city = excluded.city,
        venue = excluded.venue,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        window_start = excluded.window_start,
        window_end = excluded.window_end,
        rubric_json = excluded.rubric_json,
        tracks_json = excluded.tracks_json,
        reveal_scores = excluded.reveal_scores,
        quota_alert = excluded.quota_alert`,
    )
    .bind(
      id,
      patch.luma_url ?? current.luma_url,
      patch.title ?? current.title,
      patch.city ?? current.city,
      patch.venue ?? current.venue,
      patch.starts_at ?? current.starts_at,
      patch.ends_at ?? current.ends_at,
      patch.window_start ?? current.window_start,
      patch.window_end ?? current.window_end,
      patch.rubric_json ?? JSON.stringify(current.rubric),
      patch.tracks_json ?? JSON.stringify(current.tracks),
      (patch.reveal_scores ?? current.reveal_scores) ? 1 : 0,
      (patch.quota_alert ?? current.quota_alert) ? 1 : 0,
    )
    .run();
}

export async function importGuests(
  db: D1Database,
  rows: { email: string; name: string }[],
  source = "csv",
) {
  const imported_at = new Date().toISOString();
  for (const row of rows) {
    await db
      .prepare(
        `INSERT INTO guest_list (email, name, source, imported_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET name = excluded.name, source = excluded.source`,
      )
      .bind(row.email.toLowerCase(), row.name, source, imported_at)
      .run();
  }
  return rows.length;
}

export async function guestExists(db: D1Database, email: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT email FROM guest_list WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ email: string }>();
  return Boolean(row);
}

export async function listRecentJudgeFailures(db: D1Database, sinceIso: string) {
  const rows = await db
    .prepare(
      `SELECT id, error, started_at, finished_at FROM judge_runs
       WHERE phase = 'failed' AND started_at >= ? ORDER BY started_at DESC LIMIT 10`,
    )
    .bind(sinceIso)
    .all<{ id: string; error: string | null; started_at: string; finished_at: string | null }>();
  return rows.results ?? [];
}

export async function listOldSubmissions(db: D1Database, olderThanIso: string) {
  const rows = await db
    .prepare("SELECT id, created_at FROM submissions WHERE created_at <= ?")
    .bind(olderThanIso)
    .all<{ id: string; created_at: string }>();
  return rows.results ?? [];
}

export async function listDeployments(db: D1Database) {
  const rows = await db
    .prepare("SELECT * FROM deployments")
    .all<{
      submission_id: string;
      method: string;
      url: string;
      sandbox_url: string;
      sandbox_id: string;
      port: number | null;
      healthy: number;
      last_seen_at: string;
    }>();
  return rows.results ?? [];
}

export async function markDeploymentUnhealthy(db: D1Database, submissionId: string) {
  await db
    .prepare("UPDATE deployments SET healthy = 0, last_seen_at = ? WHERE submission_id = ?")
    .bind(new Date().toISOString(), submissionId)
    .run();
}

export async function insertIngestToken(
  db: D1Database,
  row: {
    token: string;
    submission_id: string;
    judge: string;
    run_id: string;
    session_url: string;
    created_at: string;
  },
) {
  await db
    .prepare(
      `INSERT INTO ingest_tokens (token, submission_id, judge, run_id, session_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(row.token, row.submission_id, row.judge, row.run_id, row.session_url, row.created_at)
    .run();
}

export async function getIngestToken(db: D1Database, token: string) {
  return db
    .prepare("SELECT * FROM ingest_tokens WHERE token = ?")
    .bind(token)
    .first<{
      token: string;
      submission_id: string;
      judge: string;
      run_id: string;
      session_url: string;
      created_at: string;
    }>();
}

export async function updateIngestToken(
  db: D1Database,
  token: string,
  patch: { session_url?: string },
) {
  const current = await getIngestToken(db, token);
  if (!current) return;
  await db
    .prepare("UPDATE ingest_tokens SET session_url = ? WHERE token = ?")
    .bind(patch.session_url ?? current.session_url, token)
    .run();
}

export async function findJudgeRun(db: D1Database, submissionId: string, judge: string) {
  return db
    .prepare(
      `SELECT id FROM judge_runs WHERE submission_id = ? AND judge = ?
       ORDER BY started_at DESC LIMIT 1`,
    )
    .bind(submissionId, judge)
    .first<{ id: string }>();
}
