/**
 * Strength maths, as in Record. Both numbers build on the Epley formula, which estimates the
 * heaviest single rep from a set: weight x (1 + reps / 30).
 */

/** Beyond this many reps Epley overshoots badly, so one-rep-max estimates stop counting. */
export const RM_REPS_CAP = 10;

/** Epley multiplier for a set of `reps`. A single rep is the weight itself. */
export function epley(reps: number): number {
  return reps <= 1 ? 1 : 1 + reps / 30;
}

/** Epley multiplier with reps above the cap counted as the cap. */
export function cappedEpley(reps: number): number {
  return epley(Math.min(reps, RM_REPS_CAP));
}

/**
 * Ranks sets of a bodyweight exercise against each other: total weight moved, scaled by reps.
 * Uncapped on purpose, so 20 reps always beats 15.
 */
export function strengthIndex(reps: number, loadKg: number, bodyWeightKg: number): number {
  return (bodyWeightKg + loadKg) * epley(reps);
}

/**
 * Estimated one-rep max of a bodyweight exercise, as extra load on top of body weight:
 * "you could do one pull-up with +27.5 kg". Rounded to 0.1 kg, never below zero.
 */
export function oneRepMaxAddedKg(reps: number, loadKg: number, bodyWeightKg: number): number {
  if (!(reps > 0)) return 0;
  const added = (bodyWeightKg + loadKg) * cappedEpley(reps) - bodyWeightKg;
  return added > 0 ? Math.round(added * 10) / 10 : 0;
}

/** Estimated one-rep max of a lift with an external load, rounded to 0.1 kg. */
export function oneRepMaxKg(reps: number, loadKg: number): number {
  if (!(reps > 0) || !(loadKg > 0)) return 0;
  return Math.round(loadKg * cappedEpley(reps) * 10) / 10;
}

/** Estimated one-rep max of a bodyweight set as a multiple of body weight. */
export function relativeStrength(reps: number, loadKg: number, bodyWeightKg: number): number {
  return ((bodyWeightKg + loadKg) * cappedEpley(reps)) / bodyWeightKg;
}
