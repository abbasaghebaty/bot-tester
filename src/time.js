export function isValidTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function localDateTimeParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const out = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { date: `${out.year}-${out.month}-${out.day}`, time: `${out.hour}:${out.minute}` };
}

// Stored dates must be Gregorian YYYY-MM-DD. Persian-calendar dates should be
// converted by the frontend before being sent to this API.
export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
