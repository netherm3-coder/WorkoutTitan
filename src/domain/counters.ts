import { daysBetween, type Day } from './dates';

/** Time between two days the way people say it: 3 years, 9 months and 22 days. */
export type Elapsed = {
  years: number;
  months: number;
  days: number;
  /** The same stretch of time counted in days alone. */
  totalDays: number;
};

/**
 * How long ago `start` was. Record shows this for training experience and for the sobriety
 * counter. A start that has not come yet counts as nothing.
 *
 * Months are whole calendar months: from the 31st to the last day of a shorter month is a
 * month, as it is on a calendar.
 */
export function elapsedSince(start: Day, today: Day): Elapsed {
  const totalDays = daysBetween(start, today);
  if (totalDays <= 0) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  const [startYear = 0, startMonth = 1, startDate = 1] = start.split('-').map(Number);
  const [year = 0, month = 1] = today.split('-').map(Number);

  // Whole months, one fewer if this month's anniversary is still ahead.
  let months = (year - startYear) * 12 + (month - startMonth);
  let anniversary = monthsLater(startYear, startMonth, startDate, months);
  if (anniversary > today) {
    months -= 1;
    anniversary = monthsLater(startYear, startMonth, startDate, months);
  }

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: daysBetween(anniversary, today),
    totalDays,
  };
}

/** The same day of the month `count` months later, or that month's last day if it is shorter. */
function monthsLater(year: number, month: number, date: number, count: number): Day {
  const index = month - 1 + count;
  const targetYear = year + Math.floor(index / 12);
  const targetMonth = (index % 12) + 1;
  const lastDate = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth)}-${pad(Math.min(date, lastDate))}`;
}
