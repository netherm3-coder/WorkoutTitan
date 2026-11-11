import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LADDERS,
  ACHIEVEMENTS,
  BUILT_IN_EXERCISES,
  STATUS_LEVELS,
} from '@/domain';

import { resources } from '../index';
import { LANGUAGES } from '../languages';

const sorted = (keys: readonly string[]) => [...keys].sort();

/** The domain names things by id; the catalogues have to have a word for every one of them. */
describe.each(LANGUAGES)('names of domain things in %s', (language) => {
  const { achievements, exercises, status } = resources[language].translation;

  it('names and describes every achievement, and nothing else', () => {
    expect(sorted(Object.keys(achievements.items))).toEqual(sorted(ACHIEVEMENTS.map((achievement) => achievement.id)));

    for (const [id, item] of Object.entries(achievements.items)) {
      expect({ id, named: item.name.length > 0, described: item.description.length > 0 }).toEqual({
        id,
        named: true,
        described: true,
      });
    }
  });

  it('gives achievements names of their own', () => {
    const names = Object.values(achievements.items).map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('quotes the number of points in the one description that depends on it', () => {
    const withPoints = Object.entries(achievements.items)
      .filter(([, item]) => item.description.includes('{{points}}'))
      .map(([id]) => id);
    expect(withPoints).toEqual(['persistent']);
  });

  it('names every achievement category, plus the filter that shows all of them', () => {
    expect(sorted(Object.keys(achievements.categories))).toEqual(sorted(['all', ...ACHIEVEMENT_CATEGORIES]));
  });

  it('names every ladder of achievements', () => {
    expect(sorted(Object.keys(achievements.ladders))).toEqual(sorted(Object.keys(ACHIEVEMENT_LADDERS)));
  });

  it('names every built-in exercise', () => {
    expect(sorted(Object.keys(exercises))).toEqual(sorted(BUILT_IN_EXERCISES.map((exercise) => exercise.id)));
  });

  it('names every level of the sport status', () => {
    expect(sorted(Object.keys(status.levels))).toEqual(sorted(STATUS_LEVELS.map((level) => level.id)));
  });
});
