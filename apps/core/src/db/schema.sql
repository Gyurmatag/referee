CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  github_login TEXT UNIQUE,
  github_id INTEGER,
  name TEXT,
  avatar_url TEXT,
  luma_email TEXT,
  luma_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'participant',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS event (
  id TEXT PRIMARY KEY,
  luma_url TEXT,
  title TEXT,
  city TEXT,
  venue TEXT,
  starts_at TEXT,
  ends_at TEXT,
  window_start TEXT,
  window_end TEXT,
  rubric_json TEXT,
  tracks_json TEXT,
  reveal_scores INTEGER DEFAULT 0,
  quota_alert INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guest_list (
  email TEXT PRIMARY KEY,
  name TEXT,
  source TEXT,
  imported_at TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  team_name TEXT,
  repo_url TEXT,
  live_url TEXT,
  claims_json TEXT,
  run_hints TEXT,
  devin_links_json TEXT,
  display_consent INTEGER,
  head_sha TEXT,
  status TEXT,
  confidence REAL,
  score_json TEXT,
  external_verdict_json TEXT,
  queue_position INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS judge_runs (
  id TEXT PRIMARY KEY,
  submission_id TEXT,
  judge TEXT,
  runner TEXT,
  phase TEXT,
  log_tail TEXT,
  report_json TEXT,
  transcript_key TEXT,
  session_url TEXT,
  started_at TEXT,
  finished_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS provenance (
  submission_id TEXT PRIMARY KEY,
  repo_created_at TEXT,
  is_fork INTEGER,
  parent_repo TEXT,
  commits_json TEXT,
  in_window_ratio REAL,
  bot_commit_ratio REAL,
  coauthor_devin_ratio REAL,
  devin_prs INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS deployments (
  submission_id TEXT PRIMARY KEY,
  method TEXT,
  url TEXT,
  sandbox_url TEXT,
  sandbox_id TEXT,
  port INTEGER,
  healthy INTEGER,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  submission_id TEXT PRIMARY KEY,
  fork_repo TEXT,
  pr_url TEXT,
  review_url TEXT,
  summary TEXT,
  summary_score REAL DEFAULT 0,
  screenshots_json TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS ingest_tokens (
  token TEXT PRIMARY KEY,
  submission_id TEXT,
  judge TEXT,
  run_id TEXT,
  session_url TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT,
  kind TEXT,
  message TEXT,
  at TEXT
);

CREATE TABLE IF NOT EXISTS overrides (
  submission_id TEXT,
  dimension TEXT,
  value REAL,
  note TEXT,
  by_user TEXT,
  at TEXT
);

INSERT OR IGNORE INTO event (
  id, luma_url, title, starts_at, ends_at, window_start, window_end,
  rubric_json, tracks_json, reveal_scores, quota_alert
) VALUES (
  'default',
  '',
  'Referee event',
  '2026-09-19T00:00:00.000Z',
  '2026-09-20T12:00:00.000Z',
  '2026-09-19T00:00:00.000Z',
  '2026-09-20T12:00:00.000Z',
  '{}',
  '{}',
  0,
  0
);
