import { isValidTime } from './time.js';

export function validateSchedule(periods) {
  if (!Array.isArray(periods) || periods.length < 3) {
    return { valid: false, error: 'حداقل سه زنگ باید تعریف شود.' };
  }
  const sorted = [...periods].sort((a, b) => Number(a.period_number) - Number(b.period_number));
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (Number(p.period_number) !== i + 1) {
      return { valid: false, error: 'شماره زنگ‌ها باید از ۱ شروع شده و پشت‌سرهم باشند.' };
    }
    if (!isValidTime(p.start_time) || !isValidTime(p.end_time)) {
      return { valid: false, error: `ساعت شروع و پایان زنگ ${i + 1} معتبر نیست.` };
    }
    if (p.start_time >= p.end_time) {
      return { valid: false, error: `پایان زنگ ${i + 1} باید بعد از شروع آن باشد.` };
    }
    if (i > 0 && p.start_time < sorted[i - 1].end_time) {
      return { valid: false, error: `زنگ ${i + 1} با زنگ قبلی هم‌پوشانی دارد.` };
    }
  }
  // Known facts supplied by the user are guardrails, not guessed schedule values.
  if (sorted[0].start_time !== '08:55') {
    return { valid: false, error: 'طبق اطلاعات ثبت‌شده، زنگ اول باید ساعت 08:55 شروع شود.' };
  }
  if (!sorted[2] || sorted[2].start_time !== '12:30') {
    return { valid: false, error: 'طبق اطلاعات ثبت‌شده، زنگ سوم باید ساعت 12:30 شروع شود.' };
  }
  if (sorted[sorted.length - 1].end_time !== '13:45') {
    return { valid: false, error: 'طبق اطلاعات ثبت‌شده، پایان آخرین زنگ باید ساعت 13:45 باشد.' };
  }
  return { valid: true, periods: sorted };
}
