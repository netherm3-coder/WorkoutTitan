import { DIPS, PULLUPS, PUSHUPS, RUN, SHUTTLE, SPRINT } from './exercises';
import type { History } from './history';

/** Lifetime totals, shown as Record's "hall of fame". */
export type Totals = {
  pullups: number;
  pushups: number;
  dips: number;
  /** Kilometres run. Sprints and shuttle runs are not distance work and stay out, as in Record. */
  runKm: number;
  /** Entries of every other exercise, counted once each. */
  otherEntries: number;
};

export function lifetimeTotals(history: Pick<History, 'entries'>): Totals {
  const totals: Totals = { pullups: 0, pushups: 0, dips: 0, runKm: 0, otherEntries: 0 };

  for (const entry of history.entries) {
    switch (entry.exerciseId) {
      case PULLUPS.id:
        totals.pullups += entry.reps ?? 0;
        break;
      case PUSHUPS.id:
        totals.pushups += entry.reps ?? 0;
        break;
      case DIPS.id:
        totals.dips += entry.reps ?? 0;
        break;
      case RUN.id:
        totals.runKm += (entry.distanceM ?? 0) / 1000;
        break;
      case SPRINT.id:
      case SHUTTLE.id:
        break;
      default:
        totals.otherEntries += 1;
    }
  }

  return totals;
}
