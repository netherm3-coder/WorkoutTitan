import { THEME_IDS } from '@/theme/types';

import { resources } from '../index';
import { LANGUAGES } from '../languages';

type Tree = { [key: string]: string | Tree };

/** Turns a nested catalogue into `{ 'a.b.c': 'text' }`. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((flat, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...flat, [path]: value } : { ...flat, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*([\w.]+)\s*}}/g)].map((match) => match[1]).sort();

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const CYRILLIC = /[Ѐ-ӿ]/;

const uk = flatten(resources.uk.translation);
const en = flatten(resources.en.translation);
const catalogues = { uk, en };

describe('translation catalogues', () => {
  it('cover every supported language', () => {
    expect(Object.keys(resources).sort()).toEqual([...LANGUAGES].sort());
  });

  it('have the same keys in both languages, apart from plural forms', () => {
    const base = (keys: string[]) => [...new Set(keys.map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
    expect(base(Object.keys(uk))).toEqual(base(Object.keys(en)));
  });

  it.each(LANGUAGES)('%s has no empty or padded strings', (language) => {
    for (const [key, text] of Object.entries(catalogues[language])) {
      expect({ key, ok: text.length > 0 && text === text.trim() }).toEqual({ key, ok: true });
    }
  });

  it('use the same placeholders in both languages', () => {
    for (const [key, text] of Object.entries(uk)) {
      const other = en[key];
      if (other !== undefined) {
        expect({ key, placeholders: placeholders(text) }).toEqual({ key, placeholders: placeholders(other) });
      }
    }
  });

  it('keep each language in its own script', () => {
    for (const [key, text] of Object.entries(uk)) {
      expect({ key, cyrillic: CYRILLIC.test(text) }).toEqual({ key, cyrillic: true });
    }
    for (const [key, text] of Object.entries(en)) {
      expect({ key, cyrillic: CYRILLIC.test(text) }).toEqual({ key, cyrillic: false });
    }
  });

  it('keep Ukrainian free of English words, apart from names', () => {
    const NAMES = new Set(['Record', 'Google', 'Play']);
    for (const [key, text] of Object.entries(uk)) {
      const words = text.replace(/{{[^}]+}}/g, '').match(/[A-Za-z]+/g) ?? [];
      expect({ key, english: words.filter((word) => !NAMES.has(word)) }).toEqual({ key, english: [] });
    }
  });

  it('spell English the British way throughout, as in "colour" and "armour"', () => {
    const AMERICAN = /\b(colors?|colored|gray|centers?|favorites?|(kilo|centi)?meters?|liters?|behaviors?|canceled|labeled|traveled)\b/i;
    for (const [key, text] of Object.entries(en)) {
      expect({ key, american: AMERICAN.exec(text)?.[0] ?? null }).toEqual({ key, american: null });
    }
  });

  it('give every plural string all the forms its language needs', () => {
    const required = { uk: ['one', 'few', 'many', 'other'], en: ['one', 'other'] } as const;
    for (const language of LANGUAGES) {
      const keys = Object.keys(catalogues[language]);
      const pluralBases = new Set(keys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, '')));
      for (const base of pluralBases) {
        for (const form of required[language]) {
          expect({ language, key: `${base}_${form}`, present: keys.includes(`${base}_${form}`) }).toEqual({
            language,
            key: `${base}_${form}`,
            present: true,
          });
        }
      }
    }
  });

  it('name and describe every theme', () => {
    for (const language of LANGUAGES) {
      for (const id of THEME_IDS) {
        expect(catalogues[language][`themes.${id}.name`]).toBeTruthy();
        expect(catalogues[language][`themes.${id}.description`]).toBeTruthy();
      }
    }
  });
});
