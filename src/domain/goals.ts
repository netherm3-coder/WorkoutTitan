import type { Measures } from './entry';
import type { Exercise } from './exercises';
import type { PedestalRecord } from './pedestal';
import { headlineHigherIsBetter, headlineOf } from './score';

/**
 * A goal is a target for a discipline's headline number: reps to reach, kilograms to lift,
 * or a time to beat in milliseconds. Free-text exercises cannot have one.
 */
export type Goal = number;

/** Largest goal that is accepted, as in Record: guards against typos and nonsense. */
export const MAX_GOAL = 1_000_000;

export function isValidGoal(goal: number): boolean {
  return Number.isFinite(goal) && goal > 0 && goal <= MAX_GOAL;
}

/** How close the all-time best is to the goal, as a whole percentage from 0 to 100. */
export function goalProgress(record: Pick<PedestalRecord, 'peak' | 'exercise'>, goal: Goal): number {
  if (record.peak === null || !(record.peak > 0) || !(goal > 0)) return 0;

  const ratio = headlineHigherIsBetter(record.exercise) ? record.peak / goal : goal / record.peak;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

/**
 * Whether a new result reaches the goal for the first time, which is the moment to celebrate.
 * `previousPeak` is the best headline number before this result, or `null` if there was none.
 */
export function reachesGoal(
  measures: Measures,
  exercise: Exercise,
  goal: Goal,
  previousPeak: number | null,
): boolean {
  const headline = headlineOf(measures, exercise);
  if (headline === null || !(headline > 0)) return false;

  if (headlineHigherIsBetter(exercise)) {
    return headline >= goal && (previousPeak === null || previousPeak < goal);
  }
  return headline <= goal && (previousPeak === null || previousPeak > goal);
}
