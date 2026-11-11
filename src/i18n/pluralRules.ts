/**
 * i18next chooses plural forms through `Intl.PluralRules`. JavaScript engines on phones do not
 * all ship it, and without it i18next quietly treats every language like English ("one" or
 * "other"), which is wrong for Ukrainian (1 день, 2 дні, 5 днів).
 *
 * `ensurePluralRules` checks what the engine can do and, only if it falls short, installs a
 * small implementation of the CLDR rules for the app's two languages.
 */

type Category = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type RuleType = 'cardinal' | 'ordinal';

type Rule = {
  categories: readonly Category[];
  select: (n: number, isInteger: boolean) => Category;
};

const between = (value: number, from: number, to: number) => value >= from && value <= to;

const english: Record<RuleType, Rule> = {
  cardinal: {
    categories: ['one', 'other'],
    select: (n, isInteger) => (isInteger && n === 1 ? 'one' : 'other'),
  },
  ordinal: {
    categories: ['one', 'two', 'few', 'other'],
    select: (n, isInteger) => {
      if (!isInteger) return 'other';
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 === 2 && mod100 !== 12) return 'two';
      if (mod10 === 3 && mod100 !== 13) return 'few';
      return 'other';
    },
  },
};

const ukrainian: Record<RuleType, Rule> = {
  cardinal: {
    categories: ['one', 'few', 'many', 'other'],
    select: (n, isInteger) => {
      // Fractions always take "other": 1,5 дня.
      if (!isInteger) return 'other';
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (between(mod10, 2, 4) && !between(mod100, 12, 14)) return 'few';
      return 'many';
    },
  },
  ordinal: {
    categories: ['few', 'other'],
    select: (n, isInteger) => (isInteger && n % 10 === 3 && n % 100 !== 13 ? 'few' : 'other'),
  },
};

const rulesByLanguage: Record<string, Record<RuleType, Rule>> = { en: english, uk: ukrainian };

/** The subset of `Intl.PluralRules` that i18next relies on, for Ukrainian and English only. */
export class PluralRulesShim {
  private readonly language: string;
  private readonly type: RuleType;
  private readonly rule: Rule;

  constructor(locales?: string | readonly string[], options?: { type?: RuleType }) {
    const requested = (typeof locales === 'string' ? locales : locales?.[0]) ?? 'en';
    const language = requested.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
    // Unknown languages get the English rule, as the app falls back to English strings anyway.
    this.language = language in rulesByLanguage ? language : 'en';
    this.type = options?.type === 'ordinal' ? 'ordinal' : 'cardinal';
    this.rule = (rulesByLanguage[this.language] ?? english)[this.type];
  }

  select(value: number): Category {
    const n = Math.abs(Number(value));
    if (!Number.isFinite(n)) return 'other';
    // Numbers are shown with at most three decimals, so that is what decides "is it a fraction".
    const shown = Math.round(n * 1000) / 1000;
    return this.rule.select(shown, Number.isInteger(shown));
  }

  resolvedOptions(): { locale: string; type: RuleType; pluralCategories: Category[] } {
    return { locale: this.language, type: this.type, pluralCategories: [...this.rule.categories] };
  }

  static supportedLocalesOf(locales: string | readonly string[]): string[] {
    const list = typeof locales === 'string' ? [locales] : [...locales];
    return list.filter((locale) => (locale.split(/[-_]/)[0]?.toLowerCase() ?? '') in rulesByLanguage);
  }
}

/** True when the engine's own plural rules already handle Ukrainian correctly. */
export function engineHandlesUkrainianPlurals(): boolean {
  try {
    const Native = (globalThis as { Intl?: { PluralRules?: unknown } }).Intl?.PluralRules;
    if (typeof Native !== 'function') return false;
    const rules = new (Native as typeof Intl.PluralRules)('uk');
    return (
      rules.select(1) === 'one' &&
      rules.select(2) === 'few' &&
      rules.select(5) === 'many' &&
      rules.resolvedOptions().pluralCategories.includes('few')
    );
  } catch {
    return false;
  }
}

/** Installs the shim when the engine cannot pluralise Ukrainian. Returns whether it did. */
export function ensurePluralRules(): boolean {
  if (engineHandlesUkrainianPlurals()) return false;

  const host = globalThis as { Intl?: object };
  host.Intl ??= {};
  Object.defineProperty(host.Intl, 'PluralRules', {
    value: PluralRulesShim,
    configurable: true,
    writable: true,
  });
  return true;
}
