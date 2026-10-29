-- Calculated default schedule from the user's known anchors:
-- Period 1 starts 08:55; period 3 starts 12:30; school ends 13:45.
-- The 08:55-12:30 interval is 215 minutes, divided across the two gaps
-- between three period starts (about 107.5 minutes each).
-- This is an inferred timetable, not a claim that the school's real timetable was verified.
INSERT INTO school_periods (period_number, start_time, end_time, enabled)
VALUES
  (1, '08:55', '10:42', 1),
  (2, '10:42', '12:30', 1),
  (3, '12:30', '13:45', 1)
ON CONFLICT(period_number) DO UPDATE SET
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  enabled = excluded.enabled,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO worker_settings (key, value, updated_at)
VALUES ('timezone', 'Asia/Tehran', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;

INSERT INTO worker_settings (key, value, updated_at)
VALUES ('auto_archive_enabled', 'true', CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
