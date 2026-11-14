import { useMemo } from 'react';

import { accessFrom, wearable, type Access, type Look } from '@/domain';
import { usePremium } from '@/purchases';
import { useAchievements, useRecords } from '@/records';

export type Wardrobe = {
  /** What the person picked, whether or not all of it is open right now. */
  chosen: Look;
  /** What is drawn: the pick with the closed items put back to the start. */
  shown: Look;
  /** What is open, from the achievements earned and the subscription. */
  access: Access;
  /** Changes the given slots of the pick. */
  choose(changes: Partial<Look>): Promise<void>;
};

/** The look of the camp and everything needed to change it. */
export function useWardrobe(): Wardrobe {
  const { look, saveLook } = useRecords();
  const { states } = useAchievements();
  const premium = usePremium();

  return useMemo(() => {
    const access = accessFrom(states, premium);
    return { chosen: look, shown: wearable(look, access), access, choose: saveLook };
  }, [states, premium, look, saveLook]);
}
