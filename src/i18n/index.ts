import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { FALLBACK_LANGUAGE, LANGUAGES, type Language } from './languages';
import en from './locales/en.json';
import uk from './locales/uk.json';
import { ensurePluralRules } from './pluralRules';

export const resources = {
  uk: { translation: uk },
  en: { translation: en },
} as const;

/** The app's translation instance. `useTranslation()` picks it up once `initI18n` has run. */
export const i18n = createInstance();

/**
 * Starts the translation layer in the given language. All strings are bundled, so it is ready
 * as soon as this returns. Calling it again only switches the language.
 */
export function initI18n(language: Language): void {
  ensurePluralRules();

  if (i18n.isInitialized) {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
    return;
  }

  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...LANGUAGES],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    initAsync: false,
    react: { useSuspense: false },
  });
}

export { FALLBACK_LANGUAGE, isLanguage, LANGUAGE_NAMES, LANGUAGES, pickLanguage, type Language } from './languages';
export { useLanguage } from './useLanguage';
