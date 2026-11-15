import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ACHIEVEMENTS, premiumSet } from '@/domain';

/**
 * The texts for the Google Play page live in store/listing.md, to be pasted into Play Console.
 * Play refuses texts over its limits, and a number in them that drifts from the app would be a
 * false claim, so both are checked here.
 */
const listing = readFileSync(join(__dirname, '..', '..', 'store', 'listing.md'), 'utf8');

/** The text under a `### heading` inside a `## language` section, up to the next heading. */
function field(language: string, heading: string): string {
  const section = listing.split(/^## /m).find((part) => part.startsWith(`${language}\n`));
  if (!section) throw new Error(`No section for ${language}`);
  const block = section.split(/^### /m).find((part) => part.startsWith(`${heading}\n`));
  if (!block) throw new Error(`No "${heading}" for ${language}`);
  return block.slice(heading.length).trim();
}

const LANGUAGES = [
  { name: 'Українська', title: 'Назва', short: 'Короткий опис', full: 'Повний опис', news: 'Що нового', letters: /[а-яіїєґ]/i },
  { name: 'English', title: 'Title', short: 'Short description', full: 'Full description', news: "What's new", letters: /^[^а-яіїєґ]*$/i },
];

/** Play counts characters, not bytes. */
const length = (text: string) => [...text].length;

describe('the Google Play page', () => {
  for (const language of LANGUAGES) {
    describe(language.name, () => {
      it('fits the limits of Play Console', () => {
        expect(length(field(language.name, language.title))).toBeLessThanOrEqual(30);
        expect(length(field(language.name, language.short))).toBeLessThanOrEqual(80);
        expect(length(field(language.name, language.full))).toBeLessThanOrEqual(4000);
        expect(length(field(language.name, language.news))).toBeLessThanOrEqual(500);
      });

      it('is written in its own language and starts with the app name', () => {
        for (const heading of [language.title, language.short, language.full, language.news]) {
          expect(field(language.name, heading)).toMatch(language.letters);
        }
        expect(field(language.name, language.title)).toMatch(/^Record\b/);
      });

      it('counts achievements and premium items as the app has them', () => {
        const full = field(language.name, language.full);
        expect(full).toContain(`${ACHIEVEMENTS.length} `);
        expect(full).toContain(`${premiumSet().length} `);
      });
    });
  }
});
