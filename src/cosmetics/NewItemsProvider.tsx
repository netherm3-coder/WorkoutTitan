import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { accessFrom, earnedItems, type Reward } from '@/domain';
import { useAchievements } from '@/records';

import { itemKey, saveSeenItems } from './seenItems';

export type NewItems = {
  /** Items opened by achievements since the person last looked into the wardrobe, in wardrobe order. */
  fresh: Reward[];
  /** The person looked into the wardrobe: everything earned so far counts as seen. */
  markSeen(): void;
};

const NewItemsContext = createContext<NewItems | null>(null);

export type NewItemsProviderProps = {
  /**
   * The items seen before, as saved on the phone, or `null` on the first start of a version
   * that keeps them. Then everything earned already counts as seen: it is not news, and
   * announcing a whole history of achievements at once would be noise.
   */
  initialSeen: ReadonlySet<string> | null;
  children: ReactNode;
};

/**
 * Keeps track of the earned items the person has not seen yet. Premium items are not news here:
 * the support screen says so when the subscription starts.
 */
export function NewItemsProvider({ initialSeen, children }: NewItemsProviderProps) {
  const { states } = useAchievements();
  const earned = useMemo(() => earnedItems(accessFrom(states, false).achievements), [states]);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => initialSeen ?? new Set(earned.map(itemKey)));

  useEffect(() => {
    void saveSeenItems(seen);
  }, [seen]);

  const markSeen = useCallback(() => {
    setSeen((before) => {
      const keys = earned.map(itemKey);
      return keys.every((key) => before.has(key)) ? before : new Set([...before, ...keys]);
    });
  }, [earned]);

  const value = useMemo<NewItems>(
    () => ({ fresh: earned.filter((reward) => !seen.has(itemKey(reward))), markSeen }),
    [earned, seen, markSeen],
  );

  return <NewItemsContext.Provider value={value}>{children}</NewItemsContext.Provider>;
}

/** The earned items not seen yet. Only inside `NewItemsProvider`. */
export function useNewItems(): NewItems {
  const items = useContext(NewItemsContext);
  if (!items) throw new Error('useNewItems needs a NewItemsProvider above it');
  return items;
}
