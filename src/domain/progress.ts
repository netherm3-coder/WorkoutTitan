import type { Day } from './dates';
import type { WorkoutEntry } from './entry';
import { disciplineKey, type Exercise } from './exercises';
import { chronological, type History } from './history';
import { headlineHigherIsBetter, headlineOf } from './score';

/**
 * What a progress chart plots. As in Record: the headline number of the exercise (reps, weight
 * lifted, time, count), except for a bodyweight exercise done mostly with weight added, where
 * the reps say little and the added weight shows the progress.
 */
export type ProgressMetric = 'headline' | 'addedLoad';

export type ProgressPoint = { date: Day; value: number };

export type ProgressSeries = {
  /** The discipline, as `disciplineKey` names it: an exercise, or a run of one distance. */
  discipline: string;
  exercise: Exercise;
  /** The latest entry of the discipline. It names the discipline and holds its distance. */
  latest: WorkoutEntry;
  metric: ProgressMetric;
  /** Whether a bigger value is the better one; a chart of times is drawn the other way up. */
  higherIsBetter: boolean;
  /** The best value of each day, oldest first. */
  points: ProgressPoint[];
};

/**
 * The progress of every discipline that has numbers, the one logged last first, which is the
 * one a chart opens on. Free-text exercises have nothing to plot and are left out, and so are
 * entries whose exercise no longer exists.
 */
export function progressSeries(history: History): ProgressSeries[] {
  const groups = new Map<string, { exercise: Exercise; entries: WorkoutEntry[]; last: number }>();

  chronological(history.entries).forEach((entry, index) => {
    const exercise = history.exercises(entry.exerciseId);
    if (!exercise || exercise.kind === 'text') return;

    const key = disciplineKey(exercise, entry);
    const group = groups.get(key) ?? { exercise, entries: [], last: index };
    group.entries.push(entry);
    group.last = index;
    groups.set(key, group);
  });

  const series: (ProgressSeries & { last: number })[] = [];
  for (const [discipline, { exercise, entries, last }] of groups) {
    const withLoad = entries.filter((entry) => (entry.loadKg ?? 0) > 0).length;
    const metric: ProgressMetric = exercise.kind === 'bodyweight' && withLoad > entries.length / 2 ? 'addedLoad' : 'headline';
    const higherIsBetter = metric === 'addedLoad' || headlineHigherIsBetter(exercise);

    const best = new Map<Day, number>();
    for (const entry of entries) {
      const value = metric === 'addedLoad' ? (entry.loadKg ?? 0) : headlineOf(entry, exercise);
      if (value === null || !Number.isFinite(value)) continue;

      const kept = best.get(entry.date);
      if (kept === undefined || (higherIsBetter ? value > kept : value < kept)) best.set(entry.date, value);
    }

    const latest = entries[entries.length - 1];
    if (!latest || best.size === 0) continue;

    const points = [...best].map(([date, value]) => ({ date, value }));
    series.push({ discipline, exercise, latest, metric, higherIsBetter, points, last });
  }

  return series.sort((a, b) => b.last - a.last).map(({ last: _last, ...rest }) => rest);
}
