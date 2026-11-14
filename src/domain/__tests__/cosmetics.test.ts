import {
  ACHIEVEMENTS,
  accessFrom,
  DEFAULT_LOOK,
  earnedItems,
  evaluateAchievements,
  isLookOption,
  isOpen,
  LOOK_OPTIONS,
  NO_ACCESS,
  premiumSet,
  readLook,
  rewardsOf,
  SLOTS,
  unlockOf,
  WARDROBE,
  wardrobeCount,
  wearable,
  type Access,
  type AchievementId,
  type Look,
} from '..';

import { entry, history, resetSequence } from './support';

beforeEach(resetSequence);

const earned = (...achievements: AchievementId[]): Access => ({ achievements: new Set(achievements), premium: false });
const PREMIUM: Access = { achievements: new Set(), premium: true };

const everyItem = SLOTS.flatMap((slot) => LOOK_OPTIONS[slot].map((item) => ({ slot, item })));

describe('the catalogue', () => {
  it('offers what WorkoutTitan drew: 12 armours, 20 hats, 13 tents, 6 patterns in 12 colours, 5 skies, 5 seasons', () => {
    expect(Object.fromEntries(SLOTS.map((slot) => [slot, LOOK_OPTIONS[slot].filter((item) => item !== null).length]))).toEqual({
      armour: 12,
      hat: 20,
      tent: 13,
      pattern: 6,
      patternColour: 12,
      sky: 5,
      season: 5,
    });
  });

  it('lists nothing twice', () => {
    for (const slot of SLOTS) {
      expect(new Set(LOOK_OPTIONS[slot]).size).toBe(LOOK_OPTIONS[slot].length);
    }
  });

  it('puts the starting choice first in every slot', () => {
    for (const slot of SLOTS) {
      expect(LOOK_OPTIONS[slot][0]).toBe(DEFAULT_LOOK[slot]);
    }
  });

  it('starts with a look that needs nothing opened', () => {
    for (const slot of SLOTS) {
      expect(unlockOf(slot, DEFAULT_LOOK[slot])).toEqual({ by: 'start' });
    }
    expect(wearable(DEFAULT_LOOK, NO_ACCESS)).toEqual(DEFAULT_LOOK);
  });
});

describe('what opens an item', () => {
  it('is an achievement that exists', () => {
    const known = new Set<string>(ACHIEVEMENTS.map((achievement) => achievement.id));

    for (const { slot, item } of everyItem) {
      const unlock = unlockOf(slot, item);
      if (unlock.by === 'achievement') expect(known).toContain(unlock.achievement);
    }
  });

  it('is never the sobriety counter', () => {
    for (const achievement of ACHIEVEMENTS.filter(({ category }) => category === 'sober')) {
      expect(rewardsOf(achievement.id)).toEqual([]);
    }
  });

  it('rewards every other achievement with at least one item', () => {
    for (const achievement of ACHIEVEMENTS.filter(({ category }) => category !== 'sober')) {
      expect([achievement.id, rewardsOf(achievement.id).length > 0]).toEqual([achievement.id, true]);
    }
  });

  it('gives the very first entry a reward, so the wardrobe is not all locks', () => {
    expect(rewardsOf('first_step')).toEqual([
      { slot: 'armour', item: 'brown' },
      { slot: 'hat', item: 'sprout' },
    ]);
  });

  it('leaves "nothing" and the colour of a pattern open from the start', () => {
    expect(unlockOf('hat', null)).toEqual({ by: 'start' });
    expect(unlockOf('pattern', null)).toEqual({ by: 'start' });
    for (const colour of LOOK_OPTIONS.patternColour) {
      expect(unlockOf('patternColour', colour)).toEqual({ by: 'start' });
    }
  });

  it('accounts for every item: open from the start, earned or premium', () => {
    const count = { start: 0, achievement: 0, premium: 0 };
    for (const { slot, item } of WARDROBE) {
      count[unlockOf(slot, item).by] += 1;
    }

    // 61 items: the four starting ones, 45 to earn and 12 for subscribers.
    expect(count).toEqual({ start: 4, achievement: 45, premium: 12 });
  });
});

describe('the items a person has earned', () => {
  it('are none without achievements', () => {
    expect(earnedItems(new Set())).toEqual([]);
  });

  it('are what the earned achievements open, in wardrobe order', () => {
    expect(earnedItems(new Set<AchievementId>(['first_pullup', 'first_step']))).toEqual([
      { slot: 'armour', item: 'brown' },
      { slot: 'hat', item: 'sprout' },
      { slot: 'hat', item: 'beanie' },
    ]);
  });

  it('are all 45 to earn once every achievement is in, and never the start or the premium set', () => {
    const all = earnedItems(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)));
    expect(all).toHaveLength(45);
    expect(all.every(({ slot, item }) => unlockOf(slot, item).by === 'achievement')).toBe(true);
  });
});

describe('the premium set', () => {
  it('is these twelve items and nothing else', () => {
    expect(premiumSet()).toEqual([
      { slot: 'armour', item: 'pink' },
      { slot: 'armour', item: 'purple' },
      { slot: 'hat', item: 'topHat' },
      { slot: 'hat', item: 'headphones' },
      { slot: 'hat', item: 'catEars' },
      { slot: 'hat', item: 'duck' },
      { slot: 'tent', item: 'pink' },
      { slot: 'tent', item: 'purple' },
      { slot: 'pattern', item: 'stars' },
      { slot: 'pattern', item: 'hearts' },
      { slot: 'sky', item: 'sunset' },
      { slot: 'season', item: 'cherry' },
    ]);
  });

  it('opens with a subscription and with nothing else', () => {
    const everything = earned(...ACHIEVEMENTS.map((achievement) => achievement.id));

    for (const { slot, item } of premiumSet()) {
      expect(isOpen(slot, item, everything)).toBe(false);
      expect(isOpen(slot, item, PREMIUM)).toBe(true);
    }
  });

  it('does not open what has to be earned', () => {
    expect(isOpen('hat', 'crown', PREMIUM)).toBe(false);
    expect(isOpen('armour', 'brown', PREMIUM)).toBe(false);
  });
});

describe('isOpen', () => {
  it('opens an item once its achievement is earned', () => {
    expect(isOpen('hat', 'cowboy', NO_ACCESS)).toBe(false);
    expect(isOpen('hat', 'cowboy', earned('ten_pullups'))).toBe(false);
    expect(isOpen('hat', 'cowboy', earned('fifty_pullups'))).toBe(true);
  });

  it('follows the achievements worked out from a history', () => {
    const empty = accessFrom(evaluateAchievements(history([]), { soberDays: null }), false);
    const started = accessFrom(evaluateAchievements(history([entry('pullups', '2026-03-01', { reps: 3 })]), { soberDays: null }), false);

    expect(isOpen('hat', 'sprout', empty)).toBe(false);
    expect(isOpen('hat', 'sprout', started)).toBe(true);
    expect(isOpen('hat', 'beanie', started)).toBe(true);
    expect(isOpen('tent', 'blue', started)).toBe(false);
  });
});

describe('wardrobeCount', () => {
  it('counts what is open out of everything there is to own', () => {
    expect(wardrobeCount(NO_ACCESS)).toEqual({ open: 4, total: 61 });
    expect(wardrobeCount(earned('first_step'))).toEqual({ open: 6, total: 61 });
    expect(wardrobeCount(PREMIUM)).toEqual({ open: 16, total: 61 });
    expect(wardrobeCount({ achievements: new Set(ACHIEVEMENTS.map(({ id }) => id)), premium: true })).toEqual({ open: 61, total: 61 });
  });
});

describe('wearable', () => {
  const chosen: Look = {
    armour: 'red',
    hat: 'topHat',
    tent: 'blue',
    pattern: 'stars',
    patternColour: 'white',
    sky: 'starry',
    season: 'winter',
  };

  it('puts back to the start whatever is not open, slot by slot', () => {
    expect(wearable(chosen, earned('twenty_pullups', 'night_shift'))).toEqual({
      armour: 'red',
      hat: null,
      tent: 'canvas',
      pattern: null,
      patternColour: 'white',
      sky: 'starry',
      season: 'bare',
    });
  });

  it('shows the whole choice once everything in it is open', () => {
    const access: Access = {
      achievements: new Set<AchievementId>(['twenty_pullups', 'ten_pullups', 'night_shift', 'marathon_30']),
      premium: true,
    };

    expect(wearable(chosen, access)).toEqual(chosen);
  });

  it('does not change the choice itself', () => {
    const before = { ...chosen };
    wearable(chosen, NO_ACCESS);

    expect(chosen).toEqual(before);
  });
});

describe('readLook', () => {
  it('reads back a stored look', () => {
    const look: Look = { armour: 'blue', hat: 'duck', tent: 'pink', pattern: 'waves', patternColour: 'yellow', sky: 'rain', season: 'cherry' };

    expect(readLook(look)).toEqual(look);
  });

  it('starts from the default when nothing is stored', () => {
    expect(readLook({})).toEqual(DEFAULT_LOOK);
  });

  it('keeps "no hat" and "no pattern" apart from a missing slot', () => {
    expect(readLook({ hat: null, pattern: null })).toEqual(DEFAULT_LOOK);
    expect(readLook({ armour: null }).armour).toBe('gray');
  });

  it('replaces what this version does not offer, one slot at a time', () => {
    expect(readLook({ armour: 'chrome', hat: 'crown', sky: 7, season: ['winter'], tent: 'canvas ' })).toEqual({
      ...DEFAULT_LOOK,
      hat: 'crown',
    });
  });

  it('does not take an item from another slot', () => {
    expect(isLookOption('armour', 'canvas')).toBe(false);
    expect(isLookOption('tent', 'canvas')).toBe(true);
    expect(isLookOption('sky', 'winter')).toBe(false);
  });
});
