import { MS_PER_SECOND } from '../duration';

import type { Facts } from './facts';

export const ACHIEVEMENT_CATEGORIES = ['strength', 'speed', 'endurance', 'sober', 'general', 'progress'] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export type AchievementDefinition = {
  /** Same ids as in Record, so nothing is lost if the two ever need to be matched up. */
  id: string;
  category: AchievementCategory;
  icon: string;
  /** Points earned for unlocking it. */
  reward: number;
  /** From 0 to 1. The achievement is unlocked at 1. */
  progress: (facts: Facts, points: Points) => number;
  /** Depends on points earned from the others, so it is worked out after them. */
  meta?: true;
};

/** Points from the achievements that do not depend on points themselves. */
export type Points = {
  earned: number;
  /** How many of them the "persistent" achievement asks for. */
  target: number;
};

const toward = (amount: number, target: number) => Math.max(0, Math.min(1, amount / target));
const done = (condition: boolean) => (condition ? 1 : 0);

/** Progress toward a time to beat: the closer the best time, the nearer to 1. */
const towardTime = (bestMs: number | null, targetSeconds: number) =>
  bestMs === null || !(bestMs > 0) ? 0 : Math.min(1, (targetSeconds * MS_PER_SECOND) / bestMs);

const sober = (facts: Facts, days: number) => toward(facts.soberDays ?? 0, days);

/**
 * The "persistent" achievement asks for a share of all the points on offer. Record asked for
 * 2800 of its 4050. Its archive, shooting and can-collection achievements are gone, and the
 * sobriety ones are only offered to people who use the counter, so the bar is that same share
 * of whatever is on offer, rounded to 50: 1500 points with the counter, 1300 without.
 */
export const PERSISTENT_SHARE = 2800 / 4050;

export function persistentTarget(pointsOnOffer: number): number {
  return Math.round((PERSISTENT_SHARE * pointsOnOffer) / 50) * 50;
}

export const ACHIEVEMENTS = [
  // Strength
  { id: 'first_pullup', category: 'strength', icon: '🎯', reward: 10, progress: (f) => done(f.maxPullupReps > 0) },
  { id: 'ten_pullups', category: 'strength', icon: '💪', reward: 15, progress: (f) => toward(f.maxPullupReps, 10) },
  { id: 'twenty_pullups', category: 'strength', icon: '🔥', reward: 25, progress: (f) => toward(f.maxPullupReps, 20) },
  { id: 'fifty_pullups', category: 'strength', icon: '🏆', reward: 50, progress: (f) => toward(f.maxPullupReps, 50) },
  { id: 'century_pullups', category: 'strength', icon: '💎', reward: 150, progress: (f) => toward(f.maxPullupReps, 100) },
  { id: 'strength_master', category: 'strength', icon: '⚡', reward: 20, progress: (f) => toward(f.classicsLogged, 3) },
  { id: 'iron_will', category: 'strength', icon: '🛡️', reward: 30, progress: (f) => toward(f.longestStreakDays, 7) },
  { id: 'marathon_30', category: 'strength', icon: '🌟', reward: 75, progress: (f) => toward(f.longestStreakDays, 30) },
  { id: 'month_titan', category: 'strength', icon: '👑', reward: 40, progress: (f) => toward(f.maxEntriesInMonth, 10) },
  { id: 'bench_100', category: 'strength', icon: '🏋️', reward: 40, progress: (f) => toward(f.maxBenchKg, 100) },
  { id: 'bench_150', category: 'strength', icon: '💥', reward: 80, progress: (f) => toward(f.maxBenchKg, 150) },
  { id: 'bench_200', category: 'strength', icon: '🦍', reward: 150, progress: (f) => toward(f.maxBenchKg, 200) },

  // Speed
  { id: 'sprinter', category: 'speed', icon: '⚡', reward: 10, progress: (f) => done(f.sprintEntries > 0) },
  { id: 'lightning', category: 'speed', icon: '🌪️', reward: 30, progress: (f) => toward(f.speedEntries, 5) },

  // Endurance
  { id: 'marathoner', category: 'endurance', icon: '🏃', reward: 10, progress: (f) => done(f.runEntries > 0) },
  { id: 'iron_lungs', category: 'endurance', icon: '🫁', reward: 35, progress: (f) => toward(f.runEntries, 10) },
  { id: 'odyssey', category: 'endurance', icon: '🗺️', reward: 250, progress: (f) => toward(f.totalKm, 1000) },
  { id: 'run1k_400', category: 'endurance', icon: '☕', reward: 25, progress: (f) => towardTime(f.best1kmRunMs, 240) },
  { id: 'run1k_330', category: 'endurance', icon: '🫀', reward: 60, progress: (f) => towardTime(f.best1kmRunMs, 210) },
  { id: 'run1k_250', category: 'endurance', icon: '🔥', reward: 120, progress: (f) => towardTime(f.best1kmRunMs, 170) },
  { id: 'run1k_235', category: 'endurance', icon: '👑', reward: 250, progress: (f) => towardTime(f.best1kmRunMs, 155) },
  { id: 'run3k_1100', category: 'endurance', icon: '🎖️', reward: 90, progress: (f) => towardTime(f.best3kmRunMs, 660) },

  // Sobriety counter
  { id: 'sober_7', category: 'sober', icon: '🍃', reward: 15, progress: (f) => sober(f, 7) },
  { id: 'sober_30', category: 'sober', icon: '🌱', reward: 30, progress: (f) => sober(f, 30) },
  { id: 'sober_100', category: 'sober', icon: '💚', reward: 75, progress: (f) => sober(f, 100) },
  { id: 'sober_365', category: 'sober', icon: '🏅', reward: 200, progress: (f) => sober(f, 365) },

  // General
  { id: 'first_step', category: 'general', icon: '🚀', reward: 5, progress: (f) => toward(f.entries, 1) },
  { id: 'collector', category: 'general', icon: '📦', reward: 20, progress: (f) => toward(f.entries, 10) },
  { id: 'archivist', category: 'general', icon: '📚', reward: 50, progress: (f) => toward(f.entries, 50) },
  { id: 'historian', category: 'general', icon: '📜', reward: 40, progress: (f) => toward(f.spanDays, 180) },
  { id: 'comeback', category: 'general', icon: '🔄', reward: 25, progress: (f) => done(f.cameBack) },
  { id: 'diversity', category: 'general', icon: '🎨', reward: 30, progress: (f) => toward(f.disciplines, 5) },
  { id: 'polyglot', category: 'general', icon: '🧩', reward: 35, progress: (f) => toward(f.customExercises, 5) },
  { id: 'night_shift', category: 'general', icon: '🌙', reward: 25, progress: (f) => done(f.nightEntry) },
  {
    id: 'persistent',
    category: 'general',
    icon: '🔱',
    reward: 300,
    meta: true,
    progress: (_f, points) => toward(points.earned, points.target),
  },

  // Progress
  { id: 'improvement', category: 'progress', icon: '📈', reward: 15, progress: (f) => done(f.maxImprovements >= 1) },
  { id: 'win_streak', category: 'progress', icon: '🎖️', reward: 35, progress: (f) => toward(f.maxImprovements, 3) },
  { id: 'perfectionist', category: 'progress', icon: '🎯', reward: 25, progress: (f) => toward(f.maxEntriesInDiscipline, 20) },
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

/**
 * Achievements that are steps of one ladder and are shown as a single card with levels,
 * easiest first.
 */
export const ACHIEVEMENT_LADDERS = {
  pullups: ['first_pullup', 'ten_pullups', 'twenty_pullups', 'fifty_pullups', 'century_pullups'],
  bench: ['bench_100', 'bench_150', 'bench_200'],
  sober: ['sober_7', 'sober_30', 'sober_100', 'sober_365'],
  volume: ['first_step', 'collector', 'archivist'],
  streak: ['iron_will', 'marathon_30'],
  run1km: ['run1k_400', 'run1k_330', 'run1k_250', 'run1k_235'],
} as const satisfies Record<string, readonly AchievementId[]>;

export type AchievementLadder = keyof typeof ACHIEVEMENT_LADDERS;
