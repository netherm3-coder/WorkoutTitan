import type { History } from '../history';

import {
  ACHIEVEMENT_LADDERS,
  ACHIEVEMENTS,
  persistentTarget,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementId,
  type AchievementLadder,
} from './definitions';
import { gatherFacts } from './facts';

export {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LADDERS,
  achievementWeightKg,
  ACHIEVEMENTS,
  PERSISTENT_SHARE,
  type AchievementCategory,
  type AchievementId,
  type AchievementLadder,
} from './definitions';
export { gatherFacts, type Facts } from './facts';

export type AchievementState = {
  id: AchievementId;
  category: AchievementCategory;
  icon: string;
  reward: number;
  unlocked: boolean;
  /** From 0 to 1. */
  progress: number;
  /** Position on a ladder of related achievements, counting from 1; `null` if it stands alone. */
  ladder: { name: AchievementLadder; level: number; levels: number } | null;
};

export type AchievementOptions = {
  /**
   * Days on the sobriety counter. `null` means the person does not use the counter, and its
   * achievements are left out altogether.
   */
  soberDays: number | null;
};

const LADDER_OF = new Map<AchievementId, NonNullable<AchievementState['ladder']>>();
for (const name of Object.keys(ACHIEVEMENT_LADDERS) as AchievementLadder[]) {
  const steps: readonly AchievementId[] = ACHIEVEMENT_LADDERS[name];
  steps.forEach((id, index) => LADDER_OF.set(id, { name, level: index + 1, levels: steps.length }));
}

const sum = (definitions: readonly AchievementDefinition[]) =>
  definitions.reduce((total, definition) => total + definition.reward, 0);

/** The achievements a person is offered: the sobriety ones only with the counter in use. */
function offeredTo(options: AchievementOptions): AchievementDefinition[] {
  const definitions: readonly AchievementDefinition[] = ACHIEVEMENTS;
  return definitions.filter((definition) => options.soberDays !== null || definition.category !== 'sober');
}

/** How many points the "persistent" achievement asks for. Its description quotes this number. */
export function persistentPoints(options: AchievementOptions): number {
  return persistentTarget(sum(offeredTo(options).filter((definition) => !definition.meta)));
}

/**
 * Works out every achievement from the history. Nothing is stored: delete the entry that
 * earned an achievement and it is locked again.
 */
export function evaluateAchievements(history: History, options: AchievementOptions): AchievementState[] {
  const facts = gatherFacts(history, options.soberDays);
  const offered = offeredTo(options);
  const target = persistentPoints(options);

  // Achievements that depend on points are worked out from the points of all the others.
  const earned = sum(
    offered.filter((definition) => !definition.meta && definition.progress(facts, { earned: 0, target }) >= 1),
  );

  return offered.map((definition) => {
    const progress = definition.progress(facts, { earned, target });
    const id = definition.id as AchievementId;
    return {
      id,
      category: definition.category,
      icon: definition.icon,
      reward: definition.reward,
      unlocked: progress >= 1,
      progress,
      ladder: LADDER_OF.get(id) ?? null,
    };
  });
}

/** Points earned so far, including the ones from achievements that depend on points. */
export function earnedPoints(states: readonly AchievementState[]): number {
  return states.filter((state) => state.unlocked).reduce((total, state) => total + state.reward, 0);
}

/** Points that can be earned in total. */
export function availablePoints(states: readonly AchievementState[]): number {
  return states.reduce((total, state) => total + state.reward, 0);
}
