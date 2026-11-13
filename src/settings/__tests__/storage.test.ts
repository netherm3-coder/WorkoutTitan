import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSettings, saveLanguage, saveThemeId } from '../storage';

describe('saved settings', () => {
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('are empty on first launch', async () => {
    await expect(loadSettings()).resolves.toEqual({ themeId: null, language: null });
  });

  it('come back after being saved', async () => {
    await saveThemeId('night');
    await saveLanguage('uk');
    await expect(loadSettings()).resolves.toEqual({ themeId: 'night', language: 'uk' });
  });

  it('keep the latest choice', async () => {
    await saveThemeId('night');
    await saveThemeId('day');
    await expect(loadSettings()).resolves.toMatchObject({ themeId: 'day' });
  });

  it('ignore values the app no longer knows', async () => {
    await AsyncStorage.setItem('record.settings.themeId', 'neon');
    await AsyncStorage.setItem('record.settings.language', 'de');
    await expect(loadSettings()).resolves.toEqual({ themeId: null, language: null });
  });

  it('fall back to defaults when the store cannot be read', async () => {
    // Once only: AsyncStorage's stand-in is a jest.fn already, so spyOn hands back the shared
    // function itself and restoreAllMocks would not undo a lasting change to it.
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk failure'));
    await expect(loadSettings()).resolves.toEqual({ themeId: null, language: null });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('do not throw when a save fails', async () => {
    const full = new Error('disk full');
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(full).mockRejectedValueOnce(full);
    await expect(saveThemeId('camp')).resolves.toBeUndefined();
    await expect(saveLanguage('en')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
