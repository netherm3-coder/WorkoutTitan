import type { TFunction } from 'i18next';

import { addDays, type Day } from '@/domain';

const MONTHS = [
  'dates.months.1',
  'dates.months.2',
  'dates.months.3',
  'dates.months.4',
  'dates.months.5',
  'dates.months.6',
  'dates.months.7',
  'dates.months.8',
  'dates.months.9',
  'dates.months.10',
  'dates.months.11',
  'dates.months.12',
] as const;

/**
 * A day in words: "Today", "Yesterday", "12 November", and with the year when it is not this
 * one. Both languages put the day before the month.
 */
export function formatDay(day: Day, today: Day, t: TFunction): string {
  if (day === today) return t('dates.today');
  if (day === addDays(today, -1)) return t('dates.yesterday');

  const [year = '', month = '1', date = '1'] = day.split('-');
  const monthKey = MONTHS[Number(month) - 1] ?? MONTHS[0];
  const withoutYear = `${Number(date)} ${t(monthKey)}`;

  return year === today.slice(0, 4) ? withoutYear : `${withoutYear} ${year}`;
}
