import AsyncStorage from '@react-native-async-storage/async-storage';

import { itemKey, loadSeenItems, saveSeenItems } from '../seenItems';

const KEY = 'record.camp.seenItems';

describe('the list of seen camp items', () => {
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names an item by its slot', () => {
    expect(itemKey({ slot: 'hat', item: 'crown' })).toBe('hat:crown');
  });

  it('is unknown before it was ever saved, which is not the same as empty', async () => {
    await expect(loadSeenItems()).resolves.toBeNull();

    await saveSeenItems(new Set());
    await expect(loadSeenItems()).resolves.toEqual(new Set());
  });

  it('comes back as it was saved', async () => {
    await saveSeenItems(new Set(['hat:sprout', 'armour:brown']));
    await expect(loadSeenItems()).resolves.toEqual(new Set(['armour:brown', 'hat:sprout']));
  });

  it('counts as never saved when it cannot be read', async () => {
    for (const saved of ['[', '{}', '"hat:crown"', '["hat:crown", 3]']) {
      await AsyncStorage.setItem(KEY, saved);
      await expect(loadSeenItems()).resolves.toBeNull();
    }
  });

  it('does not throw when the phone storage fails', async () => {
    // Once only: AsyncStorage's stand-in is a jest.fn already, see the settings tests.
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk failure'));
    await expect(loadSeenItems()).resolves.toBeNull();

    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('disk full'));
    await expect(saveSeenItems(new Set(['hat:crown']))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
