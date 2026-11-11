import AsyncStorage from '@react-native-async-storage/async-storage';

import { isLanguage, type Language } from '@/i18n/languages';
import { isThemeId } from '@/theme/themes';
import type { ThemeId } from '@/theme/types';

/** Choices the person made in settings. `null` means "never chosen", so the default applies. */
export type StoredSettings = {
  themeId: ThemeId | null;
  language: Language | null;
};

const KEYS = {
  themeId: 'record.settings.themeId',
  language: 'record.settings.language',
} as const;

/**
 * Reads saved settings. Never throws: an unreadable or unknown value counts as "never chosen",
 * so a broken store cannot keep the app from starting.
 */
export async function loadSettings(): Promise<StoredSettings> {
  try {
    const [themeId, language] = await Promise.all([
      AsyncStorage.getItem(KEYS.themeId),
      AsyncStorage.getItem(KEYS.language),
    ]);
    return {
      themeId: isThemeId(themeId) ? themeId : null,
      language: isLanguage(language) ? language : null,
    };
  } catch (error) {
    console.warn('Could not read saved settings', error);
    return { themeId: null, language: null };
  }
}

export async function saveThemeId(themeId: ThemeId): Promise<void> {
  await save(KEYS.themeId, themeId);
}

export async function saveLanguage(language: Language): Promise<void> {
  await save(KEYS.language, language);
}

/** A failed save only costs the choice on next launch, so it is logged rather than thrown. */
async function save(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Could not save ${key}`, error);
  }
}
