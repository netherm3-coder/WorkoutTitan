import type { Day } from './dates';

/** One weigh-in. */
export type WeightRecord = {
  date: Day;
  kg: number;
};

/**
 * Stands in for body weight when nothing has been weighed yet, so results can still be ranked.
 * It only ever affects the order of entries, never a number shown to the person.
 */
export const FALLBACK_BODY_WEIGHT_KG = 75;

/**
 * Body weight on a given day: the latest weigh-in on or before it. A workout older than every
 * weigh-in uses the earliest one. `null` when nothing has been weighed at all.
 */
export function bodyWeightAt(date: Day, records: readonly WeightRecord[]): number | null {
  let latestBefore: WeightRecord | null = null;
  let earliest: WeightRecord | null = null;

  for (const record of records) {
    if (!(record.kg > 0)) continue;
    if (record.date <= date && (latestBefore === null || record.date > latestBefore.date)) {
      latestBefore = record;
    }
    if (earliest === null || record.date < earliest.date) {
      earliest = record;
    }
  }

  return (latestBefore ?? earliest)?.kg ?? null;
}

/** The most recent weigh-in, or `null` when there is none. */
export function latestBodyWeight(records: readonly WeightRecord[]): number | null {
  let latest: WeightRecord | null = null;
  for (const record of records) {
    if (record.kg > 0 && (latest === null || record.date > latest.date)) {
      latest = record;
    }
  }
  return latest?.kg ?? null;
}
