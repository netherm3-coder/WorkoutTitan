import type { Day } from './dates';
import type { Exercise } from './exercises';

/**
 * The numbers of one result. Which of them are filled in depends on the exercise kind;
 * the rest are `null`. Everything is metric: kilograms, metres, milliseconds.
 */
export type Measures = {
  /** Repetitions done. */
  reps: number | null;
  /** Extra load on a bodyweight exercise, or the weight lifted. */
  loadKg: number | null;
  durationMs: number | null;
  /** Distance covered; for a shuttle run, the length of one segment. */
  distanceM: number | null;
  /** How many segments a shuttle run has. */
  segments: number | null;
  /** The number of a `count` result. */
  value: number | null;
  /**
   * A result in words. Also the original wording of an imported result that the numbers do not
   * fully hold: it is then shown instead of them, while the numbers still rank the entry.
   */
  text: string | null;
};

export const NO_MEASURES: Measures = {
  reps: null,
  loadKg: null,
  durationMs: null,
  distanceM: null,
  segments: null,
  value: null,
  text: null,
};

/** One logged result. */
export type WorkoutEntry = Measures & {
  id: string;
  exerciseId: string;
  /** The day of the workout. */
  date: Day;
  /** When the entry was written, in milliseconds since 1970. */
  createdAt: number;
  note: string;
  videoUrl: string;
  resultUrl: string;
};

export type EntryProblem =
  | 'repsRequired'
  | 'loadRequired'
  | 'durationRequired'
  | 'distanceRequired'
  | 'segmentsRequired'
  | 'valueRequired'
  | 'textRequired'
  | 'negativeLoad';

const positive = (value: number | null): value is number => value !== null && Number.isFinite(value) && value > 0;

/**
 * What is missing or wrong in a result for the given exercise. An empty list means the entry
 * can be saved. Used by the logging form and to judge imported records.
 */
export function entryProblems(measures: Measures, exercise: Exercise): EntryProblem[] {
  const problems: EntryProblem[] = [];
  const need = (ok: boolean, problem: EntryProblem) => {
    if (!ok) problems.push(problem);
  };

  switch (exercise.kind) {
    case 'bodyweight':
      need(positive(measures.reps), 'repsRequired');
      need(measures.loadKg === null || measures.loadKg >= 0, 'negativeLoad');
      break;
    case 'weight':
      need(positive(measures.loadKg), 'loadRequired');
      need(positive(measures.reps), 'repsRequired');
      break;
    case 'distanceTime':
      need(positive(measures.distanceM), 'distanceRequired');
      need(positive(measures.durationMs), 'durationRequired');
      break;
    case 'shuttle':
      need(positive(measures.segments), 'segmentsRequired');
      need(positive(measures.distanceM), 'distanceRequired');
      need(positive(measures.durationMs), 'durationRequired');
      break;
    case 'duration':
      need(positive(measures.durationMs), 'durationRequired');
      break;
    case 'count':
      need(measures.value !== null && Number.isFinite(measures.value), 'valueRequired');
      break;
    case 'text':
      need(measures.text !== null && measures.text.trim().length > 0, 'textRequired');
      break;
  }

  return problems;
}
