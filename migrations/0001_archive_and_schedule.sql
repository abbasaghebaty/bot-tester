-- Safe, additive migration. Existing rows and status values are preserved.
ALTER TABLE exams ADD COLUMN period_number INTEGER;
ALTER TABLE exams ADD COLUMN archived_at TEXT;

ALTER TABLE homework ADD COLUMN period_number INTEGER;
ALTER TABLE homework ADD COLUMN archived_at TEXT;

CREATE TABLE IF NOT EXISTS school_periods (
  period_number INTEGER PRIMARY KEY CHECK (period_number > 0),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS worker_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Intentionally disabled until every period is configured and validated.
INSERT OR IGNORE INTO worker_settings (key, value) VALUES ('auto_archive_enabled', 'false');
INSERT OR IGNORE INTO worker_settings (key, value) VALUES ('timezone', 'Asia/Tehran');

CREATE INDEX IF NOT EXISTS idx_exams_archive_lookup
  ON exams (archived_at, exam_date, period_number, status);
CREATE INDEX IF NOT EXISTS idx_homework_archive_lookup
  ON homework (archived_at, due_date, period_number, status);
