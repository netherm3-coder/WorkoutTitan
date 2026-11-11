import { bodyWeightAt } from './bodyWeight';
import { daysBetween, type Day } from './dates';
import type { WorkoutEntry } from './entry';
import type { Exercise } from './exercises';
import { rankEntries, type History, type RankedEntry } from './history';
import { headlineHigherIsBetter, headlineOf } from './score';
import { oneRepMaxAddedKg, oneRepMaxKg } from './strength';

/** The standing record of one discipline. */
export type PedestalRecord = {
  discipline: string;
  exercise: Exercise;
  /** The best result. On equal scores the one set first keeps the title. */
  entry: WorkoutEntry;
  score: number;
  /**
   * The best headline number in the whole history: most reps ever, heaviest lift, fastest time.
   * It can come from another entry than the record: 15 clean pull-ups are the rep peak while
   * 5 reps with +40 kg hold the record. Goals are measured against this.
   */
  peak: number | null;
  /**
   * Estimated one-rep max from the record entry, in kilograms: extra load for bodyweight
   * exercises, total weight for lifts. `null` for other kinds, and for bodyweight exercises
   * until a body weight has been recorded.
   */
  oneRepMaxKg: number | null;
};

/** The standing record of every discipline that has at least one rankable result. */
export function buildPedestal(history: History): Map<string, PedestalRecord> {
  const pedestal = new Map<string, PedestalRecord>();

  for (const ranked of rankEntries(history)) {
    if (ranked.score === null) continue;

    const current = pedestal.get(ranked.discipline);
    const headline = headlineOf(ranked.entry, ranked.exercise);
    const peak = betterHeadline(current?.peak ?? null, headline, ranked.exercise);

    if (!current || ranked.score > current.score) {
      pedestal.set(ranked.discipline, {
        discipline: ranked.discipline,
        exercise: ranked.exercise,
        entry: ranked.entry,
        score: ranked.score,
        peak,
        oneRepMaxKg: oneRepMaxOf(ranked, history),
      });
    } else if (peak !== current.peak) {
      pedestal.set(ranked.discipline, { ...current, peak });
    }
  }

  return pedestal;
}

/**
 * Ids of the entries that were a personal best on the day they were set, i.e. beat everything
 * before them in their discipline. The first result of a discipline counts.
 */
export function personalBestIds(history: History): Set<string> {
  const best = new Map<string, number>();
  const ids = new Set<string>();

  for (const { entry, discipline, score } of rankEntries(history)) {
    if (score === null) continue;
    const previous = best.get(discipline);
    if (previous === undefined || score > previous) {
      best.set(discipline, score);
      ids.add(entry.id);
    }
  }

  return ids;
}

/** How many times each discipline's record was beaten after it was first set. */
export function improvementCounts(history: History): Map<string, number> {
  const best = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const { discipline, score } of rankEntries(history)) {
    if (score === null) continue;
    const previous = best.get(discipline);
    if (previous === undefined) {
      best.set(discipline, score);
      counts.set(discipline, 0);
    } else if (score > previous) {
      best.set(discipline, score);
      counts.set(discipline, (counts.get(discipline) ?? 0) + 1);
    }
  }

  return counts;
}

/** How long a record has stood: whole days from the day it was set until `today`. */
export function daysStanding(record: PedestalRecord, today: Day): number {
  return Math.max(0, daysBetween(record.entry.date, today));
}

function betterHeadline(current: number | null, candidate: number | null, exercise: Exercise): number | null {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return headlineHigherIsBetter(exercise) ? Math.max(current, candidate) : Math.min(current, candidate);
}

function oneRepMaxOf({ entry, exercise }: RankedEntry, history: History): number | null {
  if (entry.reps === null) return null;

  if (exercise.kind === 'weight') {
    return entry.loadKg === null ? null : oneRepMaxKg(entry.reps, entry.loadKg);
  }
  if (exercise.kind === 'bodyweight') {
    const bodyWeightKg = bodyWeightAt(entry.date, history.weights);
    return bodyWeightKg === null ? null : oneRepMaxAddedKg(entry.reps, entry.loadKg ?? 0, bodyWeightKg);
  }
  return null;
}
