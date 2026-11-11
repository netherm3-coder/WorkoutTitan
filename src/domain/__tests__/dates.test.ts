import { addDays, dayOf, daysBetween, isDay, monthOf } from '../dates';

describe('isDay', () => {
  it.each(['2026-11-12', '2024-02-29', '1999-12-31'])('accepts %s', (value) => {
    expect(isDay(value)).toBe(true);
  });

  it.each([
    ['a day that does not exist', '2026-02-30'],
    ['a leap day in a common year', '2025-02-29'],
    ['a thirteenth month', '2026-13-01'],
    ['a day without leading zeros', '2026-1-01'],
    ['a two-digit year', '26-01-01'],
    ['a timestamp', '2026-11-12T00:00:00'],
    ['an empty string', ''],
    ['a number', 20261112],
    ['nothing', null],
  ])('rejects %s', (_label, value) => {
    expect(isDay(value)).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetween('2026-05-05', '2026-05-05')).toBe(0);
  });

  it('is not shifted by daylight saving time', () => {
    // Clocks in Ukraine go forward on 29 March 2026 and back on 25 October 2026.
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
  });

  it('counts the leap day', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1);
  });

  it('refuses anything that is not a day', () => {
    expect(() => daysBetween('yesterday', '2026-01-01')).toThrow('Not a calendar day');
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-11-12', -90)).toBe('2026-08-14');
  });

  it('undoes itself', () => {
    expect(addDays(addDays('2026-06-15', 400), -400)).toBe('2026-06-15');
  });
});

describe('monthOf', () => {
  it('is the year and month of a day', () => {
    expect(monthOf('2026-11-12')).toBe('2026-11');
  });
});

describe('dayOf', () => {
  it("is the day on the phone's own calendar", () => {
    expect(dayOf(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    expect(dayOf(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('sorts as text in calendar order', () => {
    const days = [dayOf(new Date(2026, 9, 2)), dayOf(new Date(2026, 1, 11)), dayOf(new Date(2025, 11, 31))];
    expect([...days].sort()).toEqual(['2025-12-31', '2026-02-11', '2026-10-02']);
  });
});
