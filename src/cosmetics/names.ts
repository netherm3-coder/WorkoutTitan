import type { TFunction } from 'i18next';

import type { Hat, LookItem, Pattern, Reward, Season, Sky, Slot, Tent } from '@/domain';

/** The name of an item as the wardrobe shows it. "Nothing" has a name too: "no hat". */
export function itemName(t: TFunction, slot: Slot, item: LookItem): string {
  switch (slot) {
    case 'armour':
    case 'tent':
    case 'patternColour':
      return t(`camp.items.colour.${item as Tent}`);
    case 'hat':
      return t(`camp.items.hat.${(item ?? 'none') as Hat | 'none'}`);
    case 'pattern':
      return t(`camp.items.pattern.${(item ?? 'none') as Pattern | 'none'}`);
    case 'sky':
      return t(`camp.items.sky.${item as Sky}`);
    case 'season':
      return t(`camp.items.season.${item as Season}`);
  }
}

/** An item with the slot it goes in, for a list in a sentence: "headwear "sprout"". */
export function rewardName(t: TFunction, { slot, item }: Reward): string {
  return t(`camp.reward.${slot}`, { item: itemName(t, slot, item) });
}
