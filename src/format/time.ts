import { formatClock, MS_PER_MINUTE, secondsToMs } from '@/domain';

/**
 * A time as a stopwatch shows it, with fractions of a second only when there are any:
 * 24:30, 0:12.5, 0:09.87.
 */
export function formatDuration(durationMs: number): string {
  const hundredths = Math.round(durationMs / 10) % 100;
  const digits = hundredths === 0 ? 0 : hundredths % 10 === 0 ? 1 : 2;
  return formatClock(durationMs, digits);
}

/** A time split the way the form asks for it: whole minutes and seconds with their fraction. */
export function splitDuration(durationMs: number): { minutes: number; seconds: number } {
  const hundredths = Math.round(durationMs / 10);
  const minutes = Math.floor(hundredths / 6000);
  return { minutes, seconds: (hundredths - minutes * 6000) / 100 };
}

/** The other way round. Either part may be missing; both missing is no time at all. */
export function joinDuration(minutes: number | null, seconds: number | null): number | null {
  if (minutes === null && seconds === null) return null;
  return (minutes ?? 0) * MS_PER_MINUTE + secondsToMs(seconds ?? 0);
}
