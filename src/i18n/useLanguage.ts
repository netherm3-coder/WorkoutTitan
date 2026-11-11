import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { saveLanguage } from '@/settings/storage';

import { FALLBACK_LANGUAGE, isLanguage, type Language } from './languages';

/** The active language and a setter that switches every screen at once and remembers the choice. */
export function useLanguage(): { language: Language; setLanguage: (language: Language) => void } {
  const { i18n } = useTranslation();
  const language = isLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;

  const setLanguage = useCallback(
    (next: Language) => {
      void i18n.changeLanguage(next);
      void saveLanguage(next);
    },
    [i18n],
  );

  return { language, setLanguage };
}
