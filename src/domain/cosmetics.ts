import type { AchievementId, AchievementState } from './achievements';

/*
 * The camp on the home screen can be dressed up: the knight's armour and hat, the tent and
 * its print, the sky and the season. This file says what there is to choose from and what
 * opens each choice. It knows nothing about pictures; those are matched to these ids in
 * `src/cosmetics`.
 *
 * WorkoutTitan opened its items with challenges counted in sets and pounds, most of which
 * never worked. Here an item opens with one of Record's achievements, or belongs to the
 * premium set.
 */

export const COLOURS = [
  'gray',
  'brown',
  'green',
  'blue',
  'lightBlue',
  'orange',
  'yellow',
  'red',
  'white',
  'black',
  'pink',
  'purple',
] as const;
export type Colour = (typeof COLOURS)[number];

export const HATS = [
  'sprout',
  'beanie',
  'baseballCap',
  'beret',
  'bucketHat',
  'cowboy',
  'ushanka',
  'raccoon',
  'flowerCrown',
  'partyHat',
  'propeller',
  'paperBoat',
  'bucket',
  'pot',
  'egg',
  'crown',
  'topHat',
  'headphones',
  'catEars',
  'duck',
] as const;
export type Hat = (typeof HATS)[number];

export const SKIES = ['sunny', 'cloudy', 'rain', 'starry', 'sunset'] as const;
export type Sky = (typeof SKIES)[number];

/** The season decides the ground and the leaves on the trees. */
export const SEASONS = ['bare', 'summer', 'autumn', 'winter', 'cherry'] as const;
export type Season = (typeof SEASONS)[number];

/** The patched canvas tent the camp starts with, or a plain tent in one of the colours. */
export const TENTS = ['canvas', ...COLOURS] as const;
export type Tent = (typeof TENTS)[number];

export const PATTERNS = ['dots', 'stripes', 'waves', 'flowers', 'stars', 'hearts'] as const;
export type Pattern = (typeof PATTERNS)[number];

/** How the camp looks: one choice in every slot. `null` is "nothing" where that is possible. */
export type Look = {
  armour: Colour;
  hat: Hat | null;
  tent: Tent;
  pattern: Pattern | null;
  /** Only shows when there is a pattern. */
  patternColour: Colour;
  sky: Sky;
  season: Season;
};

export type Slot = keyof Look;

/** In the order the wardrobe shows them. */
export const SLOTS = ['armour', 'hat', 'tent', 'pattern', 'patternColour', 'sky', 'season'] as const satisfies readonly Slot[];

/** A choice in a slot, without saying which slot. */
export type LookItem = string | null;

/** Everything a slot offers, the starting choice first. */
export const LOOK_OPTIONS: { readonly [Key in Slot]: readonly Look[Key][] } = {
  armour: COLOURS,
  hat: [null, ...HATS],
  tent: TENTS,
  pattern: [null, ...PATTERNS],
  patternColour: ['red', ...COLOURS.filter((colour) => colour !== 'red')],
  sky: SKIES,
  season: SEASONS,
};

/** The camp as WorkoutTitan drew it by default. Everything in it is open from the start. */
export const DEFAULT_LOOK: Look = {
  armour: 'gray',
  hat: null,
  tent: 'canvas',
  pattern: null,
  patternColour: 'red',
  sky: 'sunny',
  season: 'bare',
};

/** What opens an item. */
export type Unlock =
  | { by: 'start' }
  | { by: 'achievement'; achievement: AchievementId }
  | { by: 'premium' };

const START: Unlock = { by: 'start' };
const PREMIUM: Unlock = { by: 'premium' };
const earn = (achievement: AchievementId): Unlock => ({ by: 'achievement', achievement });

/*
 * The table of rewards. The rules it follows, each of them checked by a test:
 *
 * - every achievement outside the sobriety counter opens at least one item;
 * - the sobriety counter opens nothing: it is a private, optional thing, and dressing up the
 *   camp must not depend on using it;
 * - the premium set is small and opens no other way; nothing that can be earned is sold;
 * - the harder the achievement, the rarer the item.
 */
const UNLOCKS = {
  armour: {
    gray: START,
    brown: earn('first_step'),
    green: earn('collector'),
    blue: earn('strength_master'),
    lightBlue: earn('marathoner'),
    orange: earn('sprinter'),
    yellow: earn('improvement'),
    red: earn('twenty_pullups'),
    white: earn('run1k_235'),
    black: earn('century_pullups'),
    pink: PREMIUM,
    purple: PREMIUM,
  },
  hat: {
    sprout: earn('first_step'),
    beanie: earn('first_pullup'),
    baseballCap: earn('run1k_400'),
    beret: earn('strength_master'),
    bucketHat: earn('iron_lungs'),
    cowboy: earn('fifty_pullups'),
    ushanka: earn('marathon_30'),
    raccoon: earn('century_pullups'),
    flowerCrown: earn('historian'),
    partyHat: earn('diversity'),
    propeller: earn('lightning'),
    paperBoat: earn('odyssey'),
    bucket: earn('bench_100'),
    pot: earn('bench_200'),
    egg: earn('comeback'),
    crown: earn('persistent'),
    topHat: PREMIUM,
    headphones: PREMIUM,
    catEars: PREMIUM,
    duck: PREMIUM,
  },
  tent: {
    canvas: START,
    gray: earn('comeback'),
    brown: earn('collector'),
    green: earn('iron_lungs'),
    blue: earn('ten_pullups'),
    lightBlue: earn('run1k_330'),
    orange: earn('diversity'),
    yellow: earn('win_streak'),
    red: earn('iron_will'),
    white: earn('twenty_pullups'),
    black: earn('bench_150'),
    pink: PREMIUM,
    purple: PREMIUM,
  },
  pattern: {
    dots: earn('polyglot'),
    stripes: earn('month_titan'),
    waves: earn('run3k_1100'),
    flowers: earn('perfectionist'),
    stars: PREMIUM,
    hearts: PREMIUM,
  },
  sky: {
    sunny: START,
    cloudy: earn('archivist'),
    rain: earn('run1k_250'),
    starry: earn('night_shift'),
    sunset: PREMIUM,
  },
  season: {
    bare: START,
    summer: earn('archivist'),
    autumn: earn('historian'),
    winter: earn('marathon_30'),
    cherry: PREMIUM,
  },
} satisfies {
  armour: Record<Colour, Unlock>;
  hat: Record<Hat, Unlock>;
  tent: Record<Tent, Unlock>;
  pattern: Record<Pattern, Unlock>;
  sky: Record<Sky, Unlock>;
  season: Record<Season, Unlock>;
};

const RULES: Partial<Record<Slot, Readonly<Record<string, Unlock>>>> = UNLOCKS;

/** Whether the slot offers this item at all. */
export function isLookOption(slot: Slot, item: unknown): item is LookItem {
  return (LOOK_OPTIONS[slot] as readonly unknown[]).includes(item);
}

/**
 * What opens an item. "Nothing" (no hat, no pattern) and the colour of a pattern are open
 * from the start: the pattern itself is what has to be earned.
 */
export function unlockOf(slot: Slot, item: LookItem): Unlock {
  return (item === null ? undefined : RULES[slot]?.[item]) ?? START;
}

/** What a person has opened so far. */
export type Access = {
  achievements: ReadonlySet<AchievementId>;
  premium: boolean;
};

export const NO_ACCESS: Access = { achievements: new Set(), premium: false };

export function accessFrom(states: readonly AchievementState[], premium: boolean): Access {
  return {
    achievements: new Set(states.filter((state) => state.unlocked).map((state) => state.id)),
    premium,
  };
}

export function isOpen(slot: Slot, item: LookItem, access: Access): boolean {
  const unlock = unlockOf(slot, item);
  switch (unlock.by) {
    case 'start':
      return true;
    case 'achievement':
      return access.achievements.has(unlock.achievement);
    case 'premium':
      return access.premium;
  }
}

/**
 * The look that is actually drawn: the chosen one, with anything that is not open put back to
 * the starting choice. The chosen look itself is kept as it was, so an item that closes (a
 * subscription that ran out, an entry that was deleted) comes back on its own when it opens
 * again.
 */
export function wearable(look: Look, access: Access): Look {
  const shown: Record<string, LookItem> = { ...look };
  for (const slot of SLOTS) {
    if (!isOpen(slot, look[slot], access)) shown[slot] = DEFAULT_LOOK[slot];
  }
  return shown as Look;
}

/**
 * Reads a stored look. A slot that is missing, or holds something this version does not
 * offer, gets the starting choice.
 */
export function readLook(stored: Readonly<Record<string, unknown>>): Look {
  const look: Record<string, LookItem> = { ...DEFAULT_LOOK };
  for (const slot of SLOTS) {
    const item = stored[slot];
    if (isLookOption(slot, item)) look[slot] = item;
  }
  return look as Look;
}

export type Reward = { slot: Slot; item: string };

/**
 * Every item there is to own, in wardrobe order. "Nothing" is not an item, and neither is the
 * colour of a pattern: it comes with the pattern.
 */
export const WARDROBE: readonly Reward[] = SLOTS.filter((slot) => slot !== 'patternColour').flatMap((slot) =>
  LOOK_OPTIONS[slot].filter((item) => item !== null).map((item) => ({ slot, item })),
);

/** The items an achievement opens. */
export function rewardsOf(achievement: AchievementId): Reward[] {
  return WARDROBE.filter(({ slot, item }) => {
    const unlock = unlockOf(slot, item);
    return unlock.by === 'achievement' && unlock.achievement === achievement;
  });
}

/** The items of the premium set. */
export function premiumSet(): Reward[] {
  return WARDROBE.filter(({ slot, item }) => unlockOf(slot, item).by === 'premium');
}

/** How many items are open, out of how many. */
export function wardrobeCount(access: Access): { open: number; total: number } {
  return {
    open: WARDROBE.filter(({ slot, item }) => isOpen(slot, item, access)).length,
    total: WARDROBE.length,
  };
}
