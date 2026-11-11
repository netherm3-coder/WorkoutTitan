import { MS_PER_SECOND } from './duration';
import type { Measures } from './entry';
import type { Exercise } from './exercises';
import { epley, strengthIndex } from './strength';

/** Turns "less is better" into a score where more is better. The scale matches Record. */
const inverse = (amount: number) => (amount > 0 ? 10_000 / amount : null);

/**
 * How good a result is within its own discipline: the higher, the better. `null` when the
 * result cannot be ranked, because it is free text or a number it needs is missing.
 *
 * Scores are only comparable inside one discipline. `bodyWeightKg` matters for bodyweight
 * exercises alone, where the body is part of the load.
 */
export function scoreOf(measures: Measures, exercise: Exercise, bodyWeightKg: number): number | null {
  const { reps, loadKg, durationMs, value } = measures;

  switch (exercise.kind) {
    case 'bodyweight':
      return reps !== null && reps > 0 ? strengthIndex(reps, loadKg ?? 0, bodyWeightKg) : null;

    case 'weight':
      return reps !== null && reps > 0 && loadKg !== null && loadKg > 0 ? loadKg * epley(reps) : null;

    case 'distanceTime':
    case 'shuttle':
      return durationMs !== null ? inverse(durationMs / MS_PER_SECOND) : null;

    case 'duration':
      if (durationMs === null || !(durationMs > 0)) return null;
      return exercise.better === 'higher' ? durationMs / MS_PER_SECOND : inverse(durationMs / MS_PER_SECOND);

    case 'count':
      if (value === null || !Number.isFinite(value)) return null;
      return exercise.better === 'lower' ? inverse(value) : value;

    case 'text':
      return null;
  }
}

/**
 * The headline number of a result: reps, weight lifted, time or count. It is what goals are
 * set in and what the "all-time best" line shows next to the record itself.
 */
export function headlineOf(measures: Measures, exercise: Exercise): number | null {
  switch (exercise.kind) {
    case 'bodyweight':
      return measures.reps;
    case 'weight':
      return measures.loadKg;
    case 'distanceTime':
    case 'shuttle':
    case 'duration':
      return measures.durationMs;
    case 'count':
      return measures.value;
    case 'text':
      return null;
  }
}

/** Whether a bigger headline number is the better one. Times against the clock are not. */
export function headlineHigherIsBetter(exercise: Exercise): boolean {
  if (exercise.kind === 'distanceTime' || exercise.kind === 'shuttle') return false;
  return exercise.better !== 'lower';
}
