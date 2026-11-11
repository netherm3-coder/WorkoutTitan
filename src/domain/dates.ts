/**
 * Workouts are dated by calendar day, not by instant: "12 November" stays 12 November whatever
 * time zone the phone is in later. A day is the string `YYYY-MM-DD`, which also sorts correctly.
 */
export type Day = string;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Days since 1970-01-01, counted in UTC so daylight saving never shifts the result. */
function epochDays(day: Day): number {
  const match = DAY_PATTERN.exec(day);
  if (!match) {
    throw new Error(`Not a calendar day: "${day}"`);
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / MS_PER_DAY;
}

function fromEpochDays(days: number): Day {
  return new Date(days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** True for a well-formed day that exists in the calendar (so not 2026-02-30). */
export function isDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  return fromEpochDays(epochDays(value)) === value;
}

/** How many days `to` is after `from`. Negative when it is earlier. */
export function daysBetween(from: Day, to: Day): number {
  return epochDays(to) - epochDays(from);
}

export function addDays(day: Day, count: number): Day {
  return fromEpochDays(epochDays(day) + count);
}

/** `YYYY-MM` of a day, for grouping by calendar month. */
export function monthOf(day: Day): string {
  return day.slice(0, 7);
}

/** The calendar day a moment falls on, in the phone's own time zone. */
export function dayOf(moment: Date): Day {
  const year = moment.getFullYear();
  const month = String(moment.getMonth() + 1).padStart(2, '0');
  const date = String(moment.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}
