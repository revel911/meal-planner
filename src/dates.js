// Date helpers for the week navigator. All in local time; weeks start Monday.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// A new local-midnight Date n days from d (n may be negative).
export function addDays(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

// The Monday (local midnight) of the week containing d.
export function mondayOf(d = new Date()) {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (base.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0, ... Sat(6)->5
  return addDays(base, -offset);
}

// The week users are planning. Sunday is the hand-off day, so it targets the
// Monday that starts tomorrow rather than the week that is about to end.
export function planningMonday(d = new Date()) {
  const monday = mondayOf(d);
  return d.getDay() === 0 ? addDays(monday, 7) : monday;
}

// Stable local-calendar key for persisting which week a plan belongs to.
export function dateKey(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateFromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dateKey(d) === key ? d : null;
}

// Whole calendar weeks from `earlierMonday` to `laterMonday`, DST-safe.
export function weeksBetween(laterMonday, earlierMonday) {
  const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utcDay(laterMonday) - utcDay(earlierMonday)) / (7 * 86400000));
}

// 7 consecutive Dates (Mon..Sun) starting at `monday`.
export function weekDates(monday) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// "Jun 1 – 7" within a month, "Jun 29 – Jul 5" across months.
export function formatRange(dates) {
  const a = dates[0];
  const b = dates[dates.length - 1];
  const left = `${MONTHS[a.getMonth()]} ${a.getDate()}`;
  const right = a.getMonth() === b.getMonth()
    ? `${b.getDate()}`
    : `${MONTHS[b.getMonth()]} ${b.getDate()}`;
  return `${left} – ${right}`;
}

// Index (0..6) of `today` within `dates`, or -1 if not in the week.
export function todayIndex(dates, today = new Date()) {
  const sameDay = (x, y) => x.getFullYear() === y.getFullYear()
    && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  return dates.findIndex((d) => sameDay(d, today));
}

// Human label for a week offset back from the current week.
export function relativeLabel(offset, today = new Date()) {
  // On Sunday, planning offset 0 is next week and offset 1 is this week.
  const calendarOffset = offset - (today.getDay() === 0 ? 1 : 0);
  if (calendarOffset === -1) return 'Next week';
  if (calendarOffset === 0) return 'This week';
  if (calendarOffset === 1) return 'Last week';
  return `${calendarOffset} weeks ago`;
}
