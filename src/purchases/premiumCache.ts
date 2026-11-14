import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'record.purchases.premium';

/** How long the store's last answer stands in for it. */
export const PREMIUM_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

type Saved = { premium: boolean; checkedAt: number };

/**
 * The store's last answer about premium. It dresses the camp right from the first frame,
 * before the store has answered, and keeps it dressed while the store cannot be reached. A
 * week after the answer it runs out, so a subscription that ended while the phone was offline
 * does not stay open for good. An answer from the future, after the clock was set back, does
 * not count either.
 *
 * Never throws: anything unreadable counts as "not premium" until the store says otherwise.
 */
export async function loadCachedPremium(now: number): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === null) return false;
    const parsed: unknown = JSON.parse(saved);
    if (!isSaved(parsed)) return false;
    const age = now - parsed.checkedAt;
    return parsed.premium && age >= 0 && age <= PREMIUM_CACHE_MS;
  } catch (error) {
    console.warn('Could not read the saved premium state', error);
    return false;
  }
}

/** Keeps the store's answer. A failed save only costs the head start on the next launch. */
export async function saveCachedPremium(premium: boolean, now: number): Promise<void> {
  try {
    const saved: Saved = { premium, checkedAt: now };
    await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  } catch (error) {
    console.warn('Could not save the premium state', error);
  }
}

function isSaved(value: unknown): value is Saved {
  if (typeof value !== 'object' || value === null) return false;
  const { premium, checkedAt } = value as Record<string, unknown>;
  return typeof premium === 'boolean' && typeof checkedAt === 'number' && Number.isFinite(checkedAt);
}
