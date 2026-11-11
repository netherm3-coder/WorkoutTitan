import { bodyWeightAt, latestBodyWeight } from './bodyWeight';
import { addDays, type Day } from './dates';
import { PULLUPS } from './exercises';
import type { History } from './history';
import { relativeStrength, RM_REPS_CAP } from './strength';

/** The rank only looks at recent training: stop training and it drops. */
export const STATUS_WINDOW_DAYS = 90;

export type StatusLevelId = 'recruit' | 'athlete' | 'candidate' | 'elite';

/**
 * Ranks by relative pull-up strength: estimated one-rep max divided by body weight.
 * "candidate" is Record's КМС, candidate for master of sport.
 */
export const STATUS_LEVELS: readonly { id: StatusLevelId; from: number; to: number }[] = [
  { id: 'recruit', from: 1.0, to: 1.2 },
  { id: 'athlete', from: 1.2, to: 1.5 },
  { id: 'candidate', from: 1.5, to: 1.8 },
  { id: 'elite', from: 1.8, to: Infinity },
];

export type SportStatus =
  /** No weigh-in yet: the coefficient cannot be worked out. */
  | { state: 'needsBodyWeight' }
  /** No pull-ups inside the window. */
  | { state: 'needsPullups' }
  | {
      state: 'ranked';
      level: StatusLevelId;
      /** Relative strength, rounded to two decimals. */
      coefficient: number;
      /** How far through the current level, 0 to 100. Always 100 at the top level. */
      progressPercent: number;
      /** The next level up, or `null` at the top. */
      nextLevel: StatusLevelId | null;
      /** Kilograms to add to the one-rep max to reach the next level; `null` at the top. */
      kgToNextLevel: number | null;
      /** The set the rank comes from. */
      best: { reps: number; loadKg: number; date: Day; repsCapped: boolean };
    };

/**
 * The sport status as Record defines it: the strongest pull-up set of the last 90 days,
 * measured as estimated one-rep max over body weight on the day of the set.
 */
export function sportStatus(history: History, today: Day): SportStatus {
  const currentBodyWeightKg = latestBodyWeight(history.weights);
  if (currentBodyWeightKg === null) {
    return { state: 'needsBodyWeight' };
  }

  const since = addDays(today, -STATUS_WINDOW_DAYS);
  let best: { coefficient: number; reps: number; loadKg: number; date: Day } | null = null;

  for (const entry of history.entries) {
    if (entry.exerciseId !== PULLUPS.id || entry.date < since) continue;
    if (entry.reps === null || !(entry.reps > 0)) continue;

    const bodyWeightKg = bodyWeightAt(entry.date, history.weights);
    if (bodyWeightKg === null) continue;

    const loadKg = entry.loadKg ?? 0;
    const coefficient = relativeStrength(entry.reps, loadKg, bodyWeightKg);
    if (best === null || coefficient > best.coefficient) {
      best = { coefficient, reps: entry.reps, loadKg, date: entry.date };
    }
  }

  if (best === null) {
    return { state: 'needsPullups' };
  }

  const coefficient = Math.round(best.coefficient * 100) / 100;
  const foundIndex = STATUS_LEVELS.findIndex((level) => coefficient < level.to);
  const index = foundIndex < 0 ? STATUS_LEVELS.length - 1 : foundIndex;
  const level = STATUS_LEVELS[index] ?? STATUS_LEVELS[0]!;
  const next = STATUS_LEVELS[index + 1] ?? null;

  const through = next ? ((coefficient - level.from) / (level.to - level.from)) * 100 : 100;

  return {
    state: 'ranked',
    level: level.id,
    coefficient,
    progressPercent: Math.max(0, Math.min(100, through)),
    nextLevel: next?.id ?? null,
    kgToNextLevel: next ? Math.max(1, Math.ceil((next.from - coefficient) * currentBodyWeightKg)) : null,
    best: { reps: best.reps, loadKg: best.loadKg, date: best.date, repsCapped: best.reps > RM_REPS_CAP },
  };
}
