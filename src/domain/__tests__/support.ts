import type { WeightRecord } from '../bodyWeight';
import type { Day } from '../dates';
import { NO_MEASURES, type Measures, type WorkoutEntry } from '../entry';
import { exerciseLookup, type Exercise } from '../exercises';
import type { History } from '../history';

let sequence = 0;

/** Starts ids and creation times over, so every test reads the same on its own. */
export function resetSequence(): void {
  sequence = 0;
}

/**
 * An entry with only the numbers a test cares about. Ids and creation times follow the order
 * the entries are made in, at midday of their day unless a test says otherwise.
 */
export function entry(
  exercise: Exercise | string,
  date: Day,
  measures: Partial<Measures> = {},
  extra: Partial<Pick<WorkoutEntry, 'id' | 'createdAt' | 'note'>> = {},
): WorkoutEntry {
  sequence += 1;
  const [year, month, day] = date.split('-').map(Number);
  return {
    ...NO_MEASURES,
    ...measures,
    id: extra.id ?? `e${sequence}`,
    exerciseId: typeof exercise === 'string' ? exercise : exercise.id,
    date,
    createdAt: extra.createdAt ?? new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, sequence).getTime(),
    note: extra.note ?? '',
    videoUrl: '',
    resultUrl: '',
  };
}

export function history(
  entries: readonly WorkoutEntry[],
  options: { custom?: readonly Exercise[]; weights?: readonly WeightRecord[] } = {},
): History {
  return { entries, exercises: exerciseLookup(options.custom ?? []), weights: options.weights ?? [] };
}

export const seconds = (count: number) => count * 1000;
export const minutes = (count: number, extraSeconds = 0) => (count * 60 + extraSeconds) * 1000;
