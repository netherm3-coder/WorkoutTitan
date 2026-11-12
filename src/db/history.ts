import { exerciseLookup, type History } from '@/domain';

import { listBodyWeights } from './body';
import { listEntries } from './entries';
import { listExercises } from './exercises';
import type { Database } from './types';

/**
 * Everything the calculations work from, read in one go. The history of one person is a few
 * thousand rows at most, so it is simply loaded whole and the domain does the rest in memory.
 *
 * Entries of an exercise that was deleted are left out; they come back with the exercise.
 */
export async function loadHistory(db: Database): Promise<History> {
  const [entries, custom, weights] = await Promise.all([listEntries(db), listExercises(db), listBodyWeights(db)]);
  const exercises = exerciseLookup(custom);

  return {
    entries: entries.filter((entry) => exercises(entry.exerciseId) !== undefined),
    exercises,
    weights,
  };
}
