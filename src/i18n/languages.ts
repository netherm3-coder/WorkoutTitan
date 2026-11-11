export const LANGUAGES = ['uk', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Used when a string is missing in the active language, and for devices in other languages. */
export const FALLBACK_LANGUAGE: Language = 'en';

/** Each language named in itself, so the picker reads the same whatever the current language. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  uk: 'Українська',
  en: 'English',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/** The parts of a device locale that matter for picking a language. */
export type DeviceLocale = {
  languageCode: string | null;
  regionCode: string | null;
};

/**
 * Picks the starting language from the device's preferred locales, most preferred first.
 *
 * The first locale that points at a supported language decides. A locale in another language
 * still counts as Ukrainian when its region is Ukraine, because many phones there run with a
 * different system language. Devices with no match start in English.
 */
export function pickLanguage(locales: readonly DeviceLocale[]): Language {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase();
    if (isLanguage(code)) {
      return code;
    }
    if (locale.regionCode?.toUpperCase() === 'UA') {
      return 'uk';
    }
  }
  return FALLBACK_LANGUAGE;
}
