import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadCachedPremium, PREMIUM_CACHE_MS, saveCachedPremium } from '../premiumCache';

const KEY = 'record.purchases.premium';
const NOW = Date.UTC(2026, 10, 14, 12);
const DAY = 24 * 60 * 60 * 1000;

describe("the store's last answer about premium", () => {
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is "no" before the store ever answered', async () => {
    await expect(loadCachedPremium(NOW)).resolves.toBe(false);
  });

  it('keeps a "yes" for a week', async () => {
    await saveCachedPremium(true, NOW);
    await expect(loadCachedPremium(NOW)).resolves.toBe(true);
    await expect(loadCachedPremium(NOW + 6 * DAY)).resolves.toBe(true);
    await expect(loadCachedPremium(NOW + PREMIUM_CACHE_MS)).resolves.toBe(true);
  });

  it('runs out after the week', async () => {
    await saveCachedPremium(true, NOW);
    await expect(loadCachedPremium(NOW + PREMIUM_CACHE_MS + 1)).resolves.toBe(false);
  });

  it('does not count when it seems to come from the future', async () => {
    await saveCachedPremium(true, NOW);
    await expect(loadCachedPremium(NOW - 1)).resolves.toBe(false);
  });

  it('keeps the latest answer, a "no" included', async () => {
    await saveCachedPremium(true, NOW);
    await saveCachedPremium(false, NOW + DAY);
    await expect(loadCachedPremium(NOW + DAY)).resolves.toBe(false);
  });

  it('counts as "no" when it cannot be read', async () => {
    for (const saved of ['{', 'true', '{"premium":"yes","checkedAt":1}', '{"premium":true}', '{"premium":true,"checkedAt":null}']) {
      await AsyncStorage.setItem(KEY, saved);
      await expect(loadCachedPremium(NOW)).resolves.toBe(false);
    }
  });

  it('does not throw when the phone storage fails', async () => {
    // Once only: AsyncStorage's stand-in is a jest.fn already, see the settings tests.
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk failure'));
    await expect(loadCachedPremium(NOW)).resolves.toBe(false);

    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(saveCachedPremium(true, NOW)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
