import { images } from './challenges.js';
import { emitChallengeEvent } from './challengeEvents';

// ---------------------------------------------
// Helper: calculates max weight for qualifying sets
// Only counts sets that meet min reps requirement
// ---------------------------------------------
export const getMinimumWeightForReps = (sets, minReps, minSets) => {
  if (!Array.isArray(sets) || sets.length === 0) return 0;

  const validSets = sets.filter(
    set => Number(set.reps) >= minReps
  );

  // must meet required number of qualifying sets
  if (validSets.length < minSets) return 0;

  const weights = validSets
    .map(set => Number(set.weight))
    .filter(w => Number.isFinite(w));

  // 🔥 final safety guard (prevents Math.min on empty array)
  if (weights.length === 0) return 0;

  return Math.min(...weights);
};

// ---------------------------------------------
// Evaluates a single rule inside a challenge
// Returns TRUE if rule is satisfied
// ---------------------------------------------
export const checkRule = (rule, exercises, session) => {
  switch (rule.metric) {

    // Strength-based progression (e.g. bench press)
    case 'minimumWeightForReps': {
      const sets = exercises[rule.exercise]?.sets || [];

      const value = getMinimumWeightForReps(
        sets,
        rule.minReps,
        rule.minSets
      );

      return value >= rule.target;
    }
    //Checks for minimum reps within the minimum amount of allowed Sets
    case 'minimumReps': {
      const sets = exercises[rule.exercise]?.sets || [];

      return sets.every(
        set => Number(set.reps) >= rule.target
      );
    }
    //Checks for minimum value within the minimum amount of allowed Sets
    case 'minimumValue': {
      const sets = exercises[rule.exercise]?.sets || [];

      if (!sets.length) return false;

      // every set must meet or exceed target
      return sets.every(set => {
        const value = Number(set[rule.field]) || 0;
        return value >= rule.target;
      });
    }

    // Simple max value check (e.g. personal best lift)
    case 'personalBest': {
      const value =
        exercises[rule.exercise]?.personalBest || 0;

      return value >= rule.target;
    }

    // Time-based challenges (uses session data instead of history)
    case 'time': {
      const value =
        session?.[rule.metric] || 0;

      return value >= rule.target;
    }

    // Unknown rule type → fail safe
    default:
      return false;
  }
};

// ---------------------------------------------
// Main challenge evaluator
// Supports AND / OR logic across multiple rules
// ---------------------------------------------
export const checkChallenge = (challenge, exercises, session = {}) => {
  const logic = challenge.requirements?.logic || "AND";
  const rules = challenge.requirements?.rules;

  // Safety check: invalid structure = not unlocked
  if (!Array.isArray(rules)) return false;

  // ALL rules must pass
  if (logic === "AND") {
    return rules.every(rule =>
      checkRule(rule, exercises, session)
    );
  }

  // ANY rule can pass
  if (logic === "OR") {
    return rules.some(rule =>
      checkRule(rule, exercises, session)
    );
  }

  return false;
};

// ---------------------------------------------
// Used for UI progress bars
// Returns numeric progress (not boolean)
// ---------------------------------------------
export const getProgress = (rule, exercises) => {
  switch (rule.metric) {

    // Strength progression tracking
    case 'minimumWeightForReps': {
    const sets = exercises[rule.exercise]?.sets || [];

      return getMinimumWeightForReps(
        sets,
        rule.minReps,
        rule.minSets
      );
    }
    //Reps progression tracking
    case 'minimumReps': {
      const sets = exercises[rule.exercise]?.sets || [];

      if (!sets.length) return 0;

      return Math.min(
        ...sets.map(set => Number(set.reps) || 0)
      );
    }
    //Value progression tracking
    case 'minimumValue': {
      const sets = exercises[rule.exercise]?.sets || [];

      if (!sets.length) return 0;

      // worst set determines progress
      return Math.min(
        ...sets.map(set => Number(set[rule.field]) || 0)
      );
    }

    // Simple tracked best value
    case 'personalBest':
      return exercises[rule.exercise]?.personalBest || 0;

    // Unknown metric → no progress tracking
    default:
      return 0;
  }
};

// ---------------------------------------------
// Global unlock checker (runs after workouts)
// Grants rewards for newly completed challenges
// ---------------------------------------------
export const checkAllChallenges = async (
  exerciseState,
  ownedItems,
  addOwnedItem
) => {
  for (const challenge of images) {

    // Determine if challenge is completed
    const unlocked = checkChallenge(
      challenge,
      exerciseState
    );

    const itemId = challenge.reward?.id;
    if (!itemId) continue;

    // Only grant reward once
    if (unlocked && !ownedItems.includes(itemId)) {
      await addOwnedItem(itemId);

    console.log("challenge:", challenge.id);
console.log("reward:", challenge.reward);
console.log("itemId:", challenge.reward?.id);

      // 🔥 broadcast completion
      emitChallengeEvent('CHALLENGE_COMPLETED', {
        id: challenge.id,
        name: challenge.name,
        tier: challenge.tier,
        exercise: challenge.requirements?.rules?.[0]?.exercise,
        reward: itemId,
      });
    }
  }
};