/** Durations are stored in milliseconds. */

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;

const CLOCK = /^(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)$/;

/**
 * Seconds as whole milliseconds. Rounding removes binary noise: 4.35 s is 4350 ms, not
 * 4350.000000000001.
 */
export function secondsToMs(seconds: number): number {
  return Math.round(seconds * MS_PER_SECOND);
}

/**
 * Reads a stopwatch time: `m:ss`, `h:mm:ss`, with optional fractions of a second (`0:24.50`).
 * Returns `null` for anything else.
 */
export function parseClock(text: string): number | null {
  const match = CLOCK.exec(text.trim());
  if (!match) return null;

  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number((match[3] ?? '0').replace(',', '.'));
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;

  return hours * MS_PER_HOUR + minutes * MS_PER_MINUTE + secondsToMs(seconds);
}

/**
 * Writes a duration as a stopwatch time: `24:30`, `1:02:03`, or `0:24.50` when
 * `fractionDigits` is set. Rounds to the digits shown, carrying into minutes and hours.
 */
export function formatClock(durationMs: number, fractionDigits: 0 | 1 | 2 = 0): string {
  const unitsPerSecond = 10 ** fractionDigits;
  const totalUnits = Math.max(0, Math.round((durationMs / MS_PER_SECOND) * unitsPerSecond));

  const totalSeconds = Math.floor(totalUnits / unitsPerSecond);
  const fraction = totalUnits % unitsPerSecond;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, '0');
  const tail = fractionDigits > 0 ? `.${String(fraction).padStart(fractionDigits, '0')}` : '';

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}${tail}`
    : `${minutes}:${pad(seconds)}${tail}`;
}
