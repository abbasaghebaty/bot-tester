import { getPeriods, getSetting, setSetting } from './db.js';
import { validateSchedule } from './schedule.js';
import { runArchive } from './archive.js';
import { isValidTime } from './time.js';

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export default {
  async fetch(request, env) {
    if (!env.DB) return json({ ok: false, error: 'D1 binding با نام DB تنظیم نشده است.' }, 500);
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({ ok: true, service: 'study-planner', time: new Date().toISOString() });
      }
      if (request.method === 'GET' && url.pathname === '/api/archive/status') {
        const periods = await getPeriods(env.DB);
        const validation = validateSchedule(periods);
        const enabled = await getSetting(env.DB, 'auto_archive_enabled', 'false');
        const timezone = await getSetting(env.DB, 'timezone', env.TIME_ZONE || 'Asia/Tehran');
        return json({ ok: true, autoArchiveEnabled: enabled === 'true' && validation.valid,
          configured: validation.valid, timezone, periods, scheduleError: validation.valid ? null : validation.error });
      }
      const mutating = (request.method === 'PUT' && url.pathname === '/api/archive/schedule') ||
        (request.method === 'POST' && ['/api/archive/disable', '/api/archive/run'].includes(url.pathname));
      if (mutating && (!env.ADMIN_TOKEN || request.headers.get('authorization') !== `Bearer ${env.ADMIN_TOKEN}`)) {
        return json({ ok: false, error: 'دسترسی غیرمجاز است.' }, 401);
      }
      if (request.method === 'PUT' && url.pathname === '/api/archive/schedule') {
        const body = await request.json();
        const periods = body?.periods;
        const validation = validateSchedule(periods);
        if (!validation.valid) return json({ ok: false, error: validation.error, autoArchiveEnabled: false }, 400);
        // Validate all rows before touching the current schedule.
        for (const p of validation.periods) {
          if (!Number.isInteger(Number(p.period_number)) || !isValidTime(p.start_time) || !isValidTime(p.end_time)) {
            return json({ ok: false, error: 'اطلاعات یکی از زنگ‌ها معتبر نیست.' }, 400);
          }
        }
        await env.DB.prepare('DELETE FROM school_periods').run();
        const statements = validation.periods.map(p => env.DB.prepare(`INSERT INTO school_periods
          (period_number, start_time, end_time, enabled, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`)
          .bind(Number(p.period_number), p.start_time, p.end_time));
        await env.DB.batch(statements);
        const timezone = typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : (env.TIME_ZONE || 'Asia/Tehran');
        // Check the time-zone identifier before enabling automation.
        try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date()); }
        catch { return json({ ok: false, error: 'منطقه زمانی نامعتبر است. برنامه زنگ‌ها ذخیره شد اما آرشیو فعال نشد.' }, 400); }
        await setSetting(env.DB, 'timezone', timezone);
        await setSetting(env.DB, 'auto_archive_enabled', 'true');
        return json({ ok: true, autoArchiveEnabled: true, timezone, periods: validation.periods });
      }
      if (request.method === 'POST' && url.pathname === '/api/archive/disable') {
        await setSetting(env.DB, 'auto_archive_enabled', 'false');
        return json({ ok: true, autoArchiveEnabled: false });
      }
      if (request.method === 'POST' && url.pathname === '/api/archive/run') {
        return json(await runArchive(env.DB, env));
      }
      return json({ ok: false, error: 'مسیر پیدا نشد.' }, 404);
    } catch (error) {
      console.error('study-planner worker error', error);
      return json({ ok: false, error: 'خطای داخلی Worker.', detail: env.ENVIRONMENT === 'development' ? String(error?.stack || error) : undefined }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runArchive(env.DB, env).then(result => {
      console.log('scheduled archive result', JSON.stringify(result));
    }).catch(error => console.error('scheduled archive failed', error)));
  }
};
