/**
 * Calendar-day helpers. Everything in the app identifies a day by its local
 * 'YYYY-MM-DD' string rather than a Date, so sessions, streaks and seeds all
 * agree on where a day begins and none of the logic needs the clock.
 */

export type DateString = string;

export function toDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(now: Date = new Date()): DateString {
  return toDateString(now);
}

function parse(date: DateString): Date {
  const [year = '1970', month = '01', day = '01'] = date.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function addDays(date: DateString, days: number): DateString {
  const parsed = parse(date);
  parsed.setDate(parsed.getDate() + days);
  return toDateString(parsed);
}

/** Whole days from `from` to `to`; negative if `to` is earlier. */
export function daysBetween(from: DateString, to: DateString): number {
  const MS_PER_DAY = 86_400_000;
  // Use UTC midnights so a DST change in between doesn't shift the count.
  const a = parse(from);
  const b = parse(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

export function isYesterday(candidate: DateString, relativeTo: DateString): boolean {
  return daysBetween(candidate, relativeTo) === 1;
}

/** 'Thu 25 Sep' — short, for the stats list. */
export function formatShort(date: DateString): string {
  return parse(date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
