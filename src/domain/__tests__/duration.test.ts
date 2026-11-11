import { formatClock, parseClock, secondsToMs } from '../duration';

describe('secondsToMs', () => {
  it('gives whole milliseconds without binary noise', () => {
    expect(secondsToMs(4.35)).toBe(4350);
    expect(secondsToMs(0.07)).toBe(70);
    expect(secondsToMs(12.5)).toBe(12500);
  });
});

describe('parseClock', () => {
  it.each([
    ['0:41', 41_000],
    ['24:30', 1_470_000],
    ['1:02:03', 3_723_000],
    ['0:24.50', 24_500],
    ['0:24,5', 24_500],
    ['3:45.07', 225_070],
    [' 2:00 ', 120_000],
    ['75:30', 4_530_000],
  ])('reads %s', (text, expected) => {
    expect(parseClock(text)).toBe(expected);
  });

  it.each(['', '41', 'abc', '12:', ':30', '-1:00', '1:2:3:4', '1:00 хв'])('does not read "%s"', (text) => {
    expect(parseClock(text)).toBeNull();
  });
});

describe('formatClock', () => {
  it('writes minutes and seconds, and hours when there are any', () => {
    expect(formatClock(41_000)).toBe('0:41');
    expect(formatClock(1_470_000)).toBe('24:30');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(0)).toBe('0:00');
  });

  it('shows fractions of a second when asked', () => {
    expect(formatClock(24_500, 2)).toBe('0:24.50');
    expect(formatClock(24_500, 1)).toBe('0:24.5');
    expect(formatClock(61_070, 2)).toBe('1:01.07');
  });

  it('carries rounding into the next minute and hour', () => {
    expect(formatClock(59_999)).toBe('1:00');
    expect(formatClock(3_599_999)).toBe('1:00:00');
    expect(formatClock(59_996, 2)).toBe('1:00.00');
  });

  it('never shows a negative time', () => {
    expect(formatClock(-5_000)).toBe('0:00');
  });

  it.each(['0:41', '24:30', '1:02:03', '10:00:00'])('gives back %s as it was read', (text) => {
    expect(formatClock(parseClock(text) ?? NaN)).toBe(text);
  });

  it.each(['0:24.50', '1:01.07', '12:00.00'])('gives back %s with hundredths', (text) => {
    expect(formatClock(parseClock(text) ?? NaN, 2)).toBe(text);
  });
});
