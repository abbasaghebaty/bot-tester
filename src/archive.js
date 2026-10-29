import { getPeriods, getSetting } from './db.js';
import { validateSchedule } from './schedule.js';
import { isValidIsoDate, localDateTimeParts } from './time.js';

export async function runArchive(db, env, now = new Date()) {
  const enabled = await getSetting(db, 'auto_archive_enabled', 'false');
  if (enabled !== 'true') {
    return { ok: true, archivedExams: 0, archivedHomework: 0, skipped: 'auto_archive_disabled' };
  }

  const timezone = await getSetting(db, 'timezone', env.TIME_ZONE || 'Asia/Tehran');
  let current;
  try { current = localDateTimeParts(now, timezone); }
  catch { return { ok: false, error: 'منطقه زمانی معتبر نیست؛ آرشیو انجام نشد.' }; }

  const periods = await getPeriods(db);
  const validation = validateSchedule(periods);
  if (!validation.valid || periods.length !== validation.periods.length) {
    return { ok: true, archivedExams: 0, archivedHomework: 0, skipped: 'schedule_incomplete', detail: validation.error };
  }

  const periodEndByNumber = new Map(validation.periods.map(p => [Number(p.period_number), p.end_time]));
  const exams = await db.prepare(`SELECT id, exam_date, period_number FROM exams
    WHERE archived_at IS NULL AND status IN ('upcoming', 'done') AND period_number IS NOT NULL`).all();
  const homework = await db.prepare(`SELECT id, due_date, period_number FROM homework
    WHERE archived_at IS NULL AND due_date IS NOT NULL AND period_number IS NOT NULL
      AND status IN ('todo', 'done', 'skipped')`).all();

  const examIds = (exams.results ?? []).filter(row => due(row.exam_date, row.period_number, periodEndByNumber, current)).map(row => row.id);
  const homeworkIds = (homework.results ?? []).filter(row => due(row.due_date, row.period_number, periodEndByNumber, current)).map(row => row.id);

  const stamp = now.toISOString();
  const statements = [
    ...examIds.map(id => db.prepare('UPDATE exams SET archived_at = ? WHERE id = ? AND archived_at IS NULL').bind(stamp, id)),
    ...homeworkIds.map(id => db.prepare('UPDATE homework SET archived_at = ? WHERE id = ? AND archived_at IS NULL').bind(stamp, id))
  ];
  if (statements.length) await db.batch(statements);
  return { ok: true, archivedExams: examIds.length, archivedHomework: homeworkIds.length, checkedAt: stamp, timezone };
}

function due(rawDate, periodNumber, endByPeriod, current) {
  if (!isValidIsoDate(rawDate)) return false;
  const endTime = endByPeriod.get(Number(periodNumber));
  if (!endTime) return false;
  const deadline = `${rawDate}T${endTime}`;
  const localNow = `${current.date}T${current.time}`;
  return deadline <= localNow;
}
