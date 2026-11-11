import { bodyWeightAt, FALLBACK_BODY_WEIGHT_KG, type WeightRecord } from './bodyWeight';
import type { WorkoutEntry } from './entry';
import { disciplineKey, type Exercise, type ExerciseLookup } from './exercises';
import { scoreOf } from './score';

/** Everything the calculations need to know about a person's training. */
export type History = {
  entries: readonly WorkoutEntry[];
  exercises: ExerciseLookup;
  weights: readonly WeightRecord[];
};

/** An entry together with what was worked out about it. */
export type RankedEntry = {
  entry: WorkoutEntry;
  exercise: Exercise;
  discipline: string;
  /** `null` when the result cannot be ranked. */
  score: number | null;
};

/** Plain code-unit order: the same on every phone, whatever its language. */
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Oldest first; entries of the same day in the order they were written. */
export function chronological(entries: readonly WorkoutEntry[]): WorkoutEntry[] {
  return [...entries].sort(
    (a, b) => compareText(a.date, b.date) || a.createdAt - b.createdAt || compareText(a.id, b.id),
  );
}

/**
 * Ranks every entry inside its discipline, oldest first. Entries whose exercise no longer
 * exists are left out: there is nothing to compare them by.
 */
export function rankEntries(history: History): RankedEntry[] {
  const ranked: RankedEntry[] = [];

  for (const entry of chronological(history.entries)) {
    const exercise = history.exercises(entry.exerciseId);
    if (!exercise) continue;

    const bodyWeightKg = bodyWeightAt(entry.date, history.weights) ?? FALLBACK_BODY_WEIGHT_KG;
    ranked.push({
      entry,
      exercise,
      discipline: disciplineKey(exercise, entry),
      score: scoreOf(entry, exercise, bodyWeightKg),
    });
  }

  return ranked;
}
