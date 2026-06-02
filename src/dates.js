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
export function relativeLabel(offset) {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Last week';
  return `${offset} weeks ago`;
}
