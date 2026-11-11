import { isLanguage, LANGUAGE_NAMES, LANGUAGES, pickLanguage } from '../languages';

const locale = (languageCode: string | null, regionCode: string | null) => ({ languageCode, regionCode });

describe('pickLanguage', () => {
  it('starts in Ukrainian on a Ukrainian device', () => {
    expect(pickLanguage([locale('uk', 'UA')])).toBe('uk');
    expect(pickLanguage([locale('UK', null)])).toBe('uk');
  });

  it('starts in English on an English device, wherever it is', () => {
    expect(pickLanguage([locale('en', 'US')])).toBe('en');
    expect(pickLanguage([locale('en', 'UA')])).toBe('en');
  });

  it('treats another system language in the Ukraine region as Ukrainian', () => {
    expect(pickLanguage([locale('ru', 'UA')])).toBe('uk');
    expect(pickLanguage([locale('pl', 'ua')])).toBe('uk');
  });

  it('respects the order of preference', () => {
    expect(pickLanguage([locale('en', 'GB'), locale('uk', 'UA')])).toBe('en');
    expect(pickLanguage([locale('uk', 'UA'), locale('en', 'GB')])).toBe('uk');
    expect(pickLanguage([locale('de', 'DE'), locale('uk', 'UA')])).toBe('uk');
  });

  it('falls back to English when nothing matches', () => {
    expect(pickLanguage([locale('de', 'DE'), locale('fr', 'FR')])).toBe('en');
    expect(pickLanguage([locale(null, null)])).toBe('en');
    expect(pickLanguage([])).toBe('en');
  });
});

describe('isLanguage', () => {
  it('accepts only the supported codes', () => {
    expect(LANGUAGES.every(isLanguage)).toBe(true);
    expect(isLanguage('ru')).toBe(false);
    expect(isLanguage('UK')).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it('names every language', () => {
    for (const language of LANGUAGES) {
      expect(LANGUAGE_NAMES[language].length).toBeGreaterThan(0);
    }
  });
});
