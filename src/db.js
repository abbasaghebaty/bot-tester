export async function getSetting(db, key, fallback = null) {
  const row = await db.prepare('SELECT value FROM worker_settings WHERE key = ?').bind(key).first();
  return row?.value ?? fallback;
}

export async function setSetting(db, key, value) {
  await db.prepare(`INSERT INTO worker_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`)
    .bind(key, String(value)).run();
}

export async function getPeriods(db) {
  const result = await db.prepare(`SELECT period_number, start_time, end_time, enabled
    FROM school_periods WHERE enabled = 1 ORDER BY period_number`).all();
  return result.results ?? [];
}
