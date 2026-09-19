ALTER TABLE submissions ADD COLUMN queue_position INTEGER;
ALTER TABLE judge_runs ADD COLUMN session_url TEXT;
ALTER TABLE reviews ADD COLUMN summary_score REAL DEFAULT 0;

CREATE TABLE IF NOT EXISTS ingest_tokens (
  token TEXT PRIMARY KEY,
  submission_id TEXT,
  judge TEXT,
  run_id TEXT,
  session_url TEXT,
  created_at TEXT
);
