// Dates are stored as ISO "YYYY-MM-DD" strings and handled in UTC so a day
// never shifts with the server's timezone.

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function weekdayOf(iso: string) {
  return parseISODate(iso).getUTCDay();
}

/** Today in Sierra Leone (GMT, no daylight saving). */
export function todayISO() {
  return toISODate(new Date());
}

/** "Wednesday, 1 October 2026" */
export function formatLong(iso: string) {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Wed 1 Oct" */
export function formatShort(iso: string) {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

export function formatBirthday(day: number, month: number) {
  return `${day} ${MONTHS[month - 1]}`;
}

/**
 * Days from `fromISO` until the next occurrence of the birthday (0 = today).
 * 29 February is celebrated on 28 February in non-leap years.
 */
export function daysUntilBirthday(day: number, month: number, fromISO: string) {
  const from = parseISODate(fromISO);
  for (const year of [from.getUTCFullYear(), from.getUTCFullYear() + 1]) {
    const isLeap = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
    const d = month === 2 && day === 29 && !isLeap ? 28 : day;
    const next = new Date(Date.UTC(year, month - 1, d));
    const diff = Math.round((next.getTime() - from.getTime()) / 86_400_000);
    if (diff >= 0) return diff;
  }
  return 365;
}
