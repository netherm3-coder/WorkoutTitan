import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Reward } from '@/domain';

const KEY = 'record.camp.seenItems';

/** How an item is kept in the list of seen ones: `hat:crown`. */
export const itemKey = ({ slot, item }: Reward): string => `${slot}:${item}`;

/**
 * The earned items the person has already seen in the wardrobe, or `null` when nothing was
 * ever saved: the first start of a version that keeps the list. Never throws; an unreadable
 * list counts as never saved.
 */
export async function loadSeenItems(): Promise<ReadonlySet<string> | null> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === null) return null;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every((key) => typeof key === 'string')) return null;
    return new Set(parsed);
  } catch (error) {
    console.warn('Could not read the seen camp items', error);
    return null;
  }
}

/** Keeps the list. A failed save only means the same items are announced once more. */
export async function saveSeenItems(keys: ReadonlySet<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...keys].sort()));
  } catch (error) {
    console.warn('Could not save the seen camp items', error);
  }
}
