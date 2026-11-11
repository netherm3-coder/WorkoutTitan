import { createInstance } from 'i18next';

import { engineHandlesUkrainianPlurals, ensurePluralRules, PluralRulesShim } from '../pluralRules';

// Node ships complete plural rules, so it is the reference the shim has to match.
const NativePluralRules = Intl.PluralRules;

const SAMPLES = [
  ...Array.from({ length: 1201 }, (_, n) => n),
  2000, 2001, 2002, 2011, 2012, 2021, 2022, 1000000, 1000001, 1000003,
  0.5, 1.5, 2.5, 10.25, 21.1, 1.0004, 0.9996, 4.999,
  -1, -2, -5, -1.5,
];

describe.each(['uk', 'en'] as const)('PluralRulesShim for %s', (language) => {
  it.each(['cardinal', 'ordinal'] as const)('picks the same %s forms as the reference', (type) => {
    const reference = new NativePluralRules(language, { type });
    const shim = new PluralRulesShim(language, { type });
    const differences = SAMPLES.filter((n) => shim.select(n) !== reference.select(n)).map(
      (n) => `${n}: shim=${shim.select(n)} reference=${reference.select(n)}`,
    );
    expect(differences).toEqual([]);
  });

  it.each(['cardinal', 'ordinal'] as const)('lists the same %s categories as the reference', (type) => {
    const reference = new NativePluralRules(language, { type }).resolvedOptions().pluralCategories;
    const shim = new PluralRulesShim(language, { type }).resolvedOptions().pluralCategories;
    expect([...shim].sort()).toEqual([...reference].sort());
  });
});

describe('PluralRulesShim', () => {
  it('accepts region tags and locale lists', () => {
    expect(new PluralRulesShim('uk-UA').select(3)).toBe('few');
    expect(new PluralRulesShim(['uk_UA', 'en']).select(5)).toBe('many');
    expect(new PluralRulesShim().select(1)).toBe('one');
  });

  it('uses the English rule for languages the app does not ship', () => {
    expect(new PluralRulesShim('de').select(1)).toBe('one');
    expect(new PluralRulesShim('de').select(2)).toBe('other');
    expect(new PluralRulesShim('de').resolvedOptions().locale).toBe('en');
  });

  it('treats values that are not numbers as "other"', () => {
    expect(new PluralRulesShim('uk').select(Number.NaN)).toBe('other');
    expect(new PluralRulesShim('uk').select(Number.POSITIVE_INFINITY)).toBe('other');
  });

  it('reports which of the requested locales it supports', () => {
    expect(PluralRulesShim.supportedLocalesOf(['uk-UA', 'de', 'en'])).toEqual(['uk-UA', 'en']);
    expect(PluralRulesShim.supportedLocalesOf('fr')).toEqual([]);
  });
});

describe('ensurePluralRules', () => {
  afterEach(() => {
    Object.defineProperty(Intl, 'PluralRules', { value: NativePluralRules, configurable: true, writable: true });
  });

  it('leaves a capable engine alone', () => {
    expect(engineHandlesUkrainianPlurals()).toBe(true);
    expect(ensurePluralRules()).toBe(false);
    expect(Intl.PluralRules).toBe(NativePluralRules);
  });

  it('installs the shim when the engine has no plural rules', () => {
    Object.defineProperty(Intl, 'PluralRules', { value: undefined, configurable: true, writable: true });
    expect(engineHandlesUkrainianPlurals()).toBe(false);
    expect(ensurePluralRules()).toBe(true);
    expect(Intl.PluralRules).toBe(PluralRulesShim);
  });

  it('installs the shim when the engine only knows English-style plurals', () => {
    class EnglishOnly {
      select(n: number) {
        return n === 1 ? 'one' : 'other';
      }
      resolvedOptions() {
        return { pluralCategories: ['one', 'other'] };
      }
    }
    Object.defineProperty(Intl, 'PluralRules', { value: EnglishOnly, configurable: true, writable: true });
    expect(ensurePluralRules()).toBe(true);
    expect(Intl.PluralRules).toBe(PluralRulesShim);
  });

  it('installs the shim when the engine throws', () => {
    class Broken {
      constructor() {
        throw new Error('not implemented');
      }
    }
    Object.defineProperty(Intl, 'PluralRules', { value: Broken, configurable: true, writable: true });
    expect(ensurePluralRules()).toBe(true);
  });
});

describe('i18next on an engine without plural rules', () => {
  afterEach(() => {
    Object.defineProperty(Intl, 'PluralRules', { value: NativePluralRules, configurable: true, writable: true });
  });

  it('still picks the right Ukrainian and English forms', async () => {
    Object.defineProperty(Intl, 'PluralRules', { value: undefined, configurable: true, writable: true });
    ensurePluralRules();

    const instance = createInstance();
    await instance.init({
      lng: 'uk',
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      resources: {
        uk: {
          translation: {
            days_one: '{{count}} день',
            days_few: '{{count}} дні',
            days_many: '{{count}} днів',
            days_other: '{{count}} дня',
          },
        },
        en: { translation: { days_one: '{{count}} day', days_other: '{{count}} days' } },
      },
    });

    // The test catalogue is not part of the app's typed keys.
    const t = instance.t.bind(instance) as unknown as (key: string, options: { count: number }) => string;
    const days = (count: number) => t('days', { count });

    expect([1, 2, 5, 11, 21, 22, 25, 112, 1.5].map(days)).toEqual([
      '1 день',
      '2 дні',
      '5 днів',
      '11 днів',
      '21 день',
      '22 дні',
      '25 днів',
      '112 днів',
      '1.5 дня',
    ]);

    await instance.changeLanguage('en');
    expect([1, 2, 21].map(days)).toEqual(['1 day', '2 days', '21 days']);
  });
});
