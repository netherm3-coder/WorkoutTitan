import createRecordReference from '../../../legacy/record/reference';
import { elapsedSince } from '../counters';
import { addDays } from '../dates';

const record = createRecordReference();
const localMidnight = (day: string) => {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
};

describe('elapsedSince', () => {
  it('counts whole years, months and days', () => {
    expect(elapsedSince('2023-01-21', '2026-11-12')).toEqual({ years: 3, months: 9, days: 22, totalDays: 1391 });
    expect(elapsedSince('2023-08-24', '2026-08-24')).toEqual({ years: 3, months: 0, days: 0, totalDays: 1096 });
    expect(elapsedSince('2026-11-01', '2026-11-12')).toEqual({ years: 0, months: 0, days: 11, totalDays: 11 });
  });

  it('is nothing on the day itself and before it', () => {
    const nothing = { years: 0, months: 0, days: 0, totalDays: 0 };
    expect(elapsedSince('2026-11-12', '2026-11-12')).toEqual(nothing);
    expect(elapsedSince('2027-01-01', '2026-11-12')).toEqual(nothing);
  });

  it('counts across a leap day', () => {
    // A year after 29 February is the last day of February.
    expect(elapsedSince('2024-02-29', '2025-02-27')).toEqual({ years: 0, months: 11, days: 29, totalDays: 364 });
    expect(elapsedSince('2024-02-29', '2025-02-28')).toEqual({ years: 1, months: 0, days: 0, totalDays: 365 });
    expect(elapsedSince('2024-02-29', '2025-03-01')).toEqual({ years: 1, months: 0, days: 1, totalDays: 366 });
    expect(elapsedSince('2024-02-29', '2028-02-29')).toEqual({ years: 4, months: 0, days: 0, totalDays: 1461 });
  });

  it('takes the end of a shorter month for a full month', () => {
    expect(elapsedSince('2026-01-31', '2026-02-28')).toMatchObject({ months: 1, days: 0 });
    expect(elapsedSince('2026-01-31', '2026-03-01')).toMatchObject({ months: 1, days: 1 });
    expect(elapsedSince('2026-01-31', '2026-03-31')).toMatchObject({ months: 2, days: 0 });
  });

  it('never shows a negative number of days; Record did for a start late in the month', () => {
    expect(record.elapsedSince(localMidnight('2026-01-31'), localMidnight('2026-03-01'))).toMatchObject({ months: 1, days: -2 });
    expect(elapsedSince('2026-01-31', '2026-03-01').days).toBeGreaterThanOrEqual(0);
  });

  it('agrees with Record for every start on the 1st to the 28th', () => {
    // Record's own two counters start on the 21st and the 24th.
    for (const start of ['2023-01-21', '2023-08-24', '2024-02-28', '2025-12-01']) {
      for (let offset = 0; offset <= 1500; offset += 1) {
        const today = addDays(start, offset);
        const theirs = record.elapsedSince(localMidnight(start), localMidnight(today));

        expect({ start, today, ...elapsedSince(start, today) }).toEqual({
          start,
          today,
          years: theirs.years,
          months: theirs.months,
          days: theirs.days,
          totalDays: theirs.total,
        });
      }
    }
  });
});
