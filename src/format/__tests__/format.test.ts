import { BENCH_PRESS, customExercise, NO_MEASURES, PULLUPS, RUN, SHUTTLE, SPRINT, type Measures } from '@/domain';
import { i18n, initI18n } from '@/i18n';

import {
  disciplineName,
  exerciseName,
  formatDay,
  formatDuration,
  formatElapsed,
  formatGoal,
  formatNumber,
  formatResult,
  formatLength,
  formatWeight,
  joinDuration,
  lengthField,
  METRIC,
  parseDecimal,
  splitDuration,
  US_UNITS,
  weightField,
} from '../index';

initI18n('en');
const en = i18n.getFixedT('en');
const uk = i18n.getFixedT('uk');

const m = (measures: Partial<Measures>): Measures => ({ ...NO_MEASURES, ...measures });

const SQUATS = customExercise({ id: 'custom:squats', name: 'Присідання', kind: 'count', unit: 'кг' });
const BURPEES = customExercise({ id: 'custom:burpees', name: 'Берпі', kind: 'count' });
const MARCH = customExercise({ id: 'custom:march', name: 'Марш-кидок', kind: 'distanceTime', distanceUnit: 'km' });
const SWIM = customExercise({ id: 'custom:swim', name: 'Плавання', kind: 'distanceTime', distanceUnit: 'm' });
const NOTES = customExercise({ id: 'custom:notes', name: 'Розтяжка', kind: 'text' });

describe('formatNumber', () => {
  it('writes decimals the way the language does, and only the ones needed', () => {
    expect(formatNumber(12, 'uk')).toBe('12');
    expect(formatNumber(7.5, 'uk')).toBe('7,5');
    expect(formatNumber(7.5, 'en')).toBe('7.5');
    expect(formatNumber(82.256, 'en')).toBe('82.26');
    expect(formatNumber(0.1 + 0.2, 'en')).toBe('0.3');
  });
});

describe('parseDecimal', () => {
  it.each([
    ['12', 12],
    [' 7,5 ', 7.5],
    ['7.5', 7.5],
    ['0', 0],
  ])('reads "%s"', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1,5,2', '12 кг', '.5', '1e3'])('does not read "%s"', (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('shows fractions of a second only when there are any', () => {
    expect(formatDuration(1_470_000)).toBe('24:30');
    expect(formatDuration(12_500)).toBe('0:12.5');
    expect(formatDuration(9_870)).toBe('0:09.87');
    expect(formatDuration(3_723_000)).toBe('1:02:03');
  });
});

describe('splitting a time for the form and joining it back', () => {
  it.each([
    [1_470_000, { minutes: 24, seconds: 30 }],
    [12_500, { minutes: 0, seconds: 12.5 }],
    [6_330_000, { minutes: 105, seconds: 30 }],
    [69_870, { minutes: 1, seconds: 9.87 }],
  ])('goes there and back for %i ms', (durationMs, parts) => {
    expect(splitDuration(durationMs)).toEqual(parts);
    expect(joinDuration(parts.minutes, parts.seconds)).toBe(durationMs);
  });

  it('takes minutes alone, seconds alone, and nothing at all', () => {
    expect(joinDuration(2, null)).toBe(120_000);
    expect(joinDuration(null, 12.5)).toBe(12_500);
    expect(joinDuration(null, 75)).toBe(75_000);
    expect(joinDuration(null, null)).toBeNull();
  });
});

describe('formatDay', () => {
  it('says today and yesterday in words', () => {
    expect(formatDay('2026-11-12', '2026-11-12', en)).toBe('Today');
    expect(formatDay('2026-11-11', '2026-11-12', uk)).toBe('Вчора');
  });

  it('names the month, and the year only when it is another one', () => {
    expect(formatDay('2026-11-05', '2026-11-12', uk)).toBe('5 листопада');
    expect(formatDay('2026-01-31', '2026-11-12', en)).toBe('31 January');
    expect(formatDay('2025-12-31', '2026-01-10', uk)).toBe('31 грудня 2025');
  });

  it('does not call the day before a new year yesterday by mistake', () => {
    expect(formatDay('2025-12-31', '2026-01-01', en)).toBe('Yesterday');
  });
});

describe('exerciseName', () => {
  it('translates built-in exercises and keeps own ones as they were named', () => {
    expect(exerciseName(PULLUPS, uk)).toBe('Підтягування');
    expect(exerciseName(PULLUPS, en)).toBe('Pull-ups');
    expect(exerciseName(SQUATS, en)).toBe('Присідання');
  });
});

describe('disciplineName', () => {
  it('adds the distance or the shuttle scheme', () => {
    expect(disciplineName(RUN, { distanceM: 5000, segments: null }, uk, 'uk')).toBe('Біг 5 км');
    expect(disciplineName(RUN, { distanceM: 21_100, segments: null }, uk, 'uk')).toBe('Біг 21,1 км');
    expect(disciplineName(SPRINT, { distanceM: 100, segments: null }, en, 'en')).toBe('Sprint 100 m');
    expect(disciplineName(SHUTTLE, { distanceM: 9, segments: 4 }, en, 'en')).toBe('Shuttle run 4×9 m');
    expect(disciplineName(MARCH, { distanceM: 30_000, segments: null }, uk, 'uk')).toBe('Марш-кидок 30 км');
    expect(disciplineName(SWIM, { distanceM: 400, segments: null }, uk, 'uk')).toBe('Плавання 400 м');
  });

  it('is just the exercise when there is no distance', () => {
    expect(disciplineName(RUN, { distanceM: null, segments: null }, en, 'en')).toBe('Run');
    expect(disciplineName(PULLUPS, { distanceM: 5, segments: 2 }, en, 'en')).toBe('Pull-ups');
  });
});

describe('formatResult', () => {
  it.each([
    ['reps', m({ reps: 12 }), PULLUPS, '12'],
    ['reps with a load', m({ reps: 12, loadKg: 7.5 }), PULLUPS, '12 (+7,5 кг)'],
    ['reps with a load and a time', m({ reps: 12, loadKg: 20, durationMs: 41_000 }), PULLUPS, '12 (+20 кг) (0:41)'],
    ['reps with no load written as zero', m({ reps: 12, loadKg: 0 }), PULLUPS, '12'],
    ['a lift', m({ reps: 5, loadKg: 100 }), BENCH_PRESS, '100 кг × 5'],
    ['a run', m({ distanceM: 5000, durationMs: 1_470_000 }), RUN, '24:30'],
    ['a sprint', m({ distanceM: 100, durationMs: 12_500 }), SPRINT, '0:12.5'],
    ['a number with a unit', m({ value: 100 }), SQUATS, '100 кг'],
    ['a number with a time', m({ value: 50, durationMs: 221_200 }), BURPEES, '50 (3:41.2)'],
    ['words', m({ text: 'шпагат майже' }), NOTES, 'шпагат майже'],
  ])('writes %s', (_label, measures, exercise, expected) => {
    expect(formatResult(measures, exercise, uk, 'uk', METRIC)).toBe(expected);
  });

  it('shows an imported result as it was written when the numbers do not hold all of it', () => {
    expect(formatResult(m({ reps: 12, text: '12 (вузький хват)' }), PULLUPS, uk, 'uk', METRIC)).toBe('12 (вузький хват)');
  });

  it('uses the units of the language', () => {
    expect(formatResult(m({ reps: 12, loadKg: 7.5 }), PULLUPS, en, 'en', METRIC)).toBe('12 (+7.5 kg)');
  });

  it('shows a dash when the numbers are missing', () => {
    expect(formatResult(m({}), PULLUPS, en, 'en', METRIC)).toBe('—');
    expect(formatResult(m({ distanceM: 5000 }), RUN, en, 'en', METRIC)).toBe('—');
    expect(formatResult(m({}), NOTES, en, 'en', METRIC)).toBe('—');
  });
});

describe('formatGoal', () => {
  it('writes a goal in the number its discipline is measured by', () => {
    expect(formatGoal(20, PULLUPS, uk, 'uk', METRIC)).toBe('20');
    expect(formatGoal(102.5, BENCH_PRESS, uk, 'uk', METRIC)).toBe('102,5 кг');
    expect(formatGoal(1_200_000, RUN, en, 'en', METRIC)).toBe('20:00');
    expect(formatGoal(12_500, SPRINT, en, 'en', METRIC)).toBe('0:12.5');
    expect(formatGoal(120, SQUATS, en, 'en', METRIC)).toBe('120 кг');
    expect(formatGoal(60, BURPEES, en, 'en', METRIC)).toBe('60');
  });
});

describe('in pounds', () => {
  it('writes loads and lifts in pounds, declined in Ukrainian', () => {
    expect(formatResult(m({ reps: 12, loadKg: 20 }), PULLUPS, en, 'en', US_UNITS)).toBe('12 (+44.1 lb)');
    expect(formatResult(m({ reps: 5, loadKg: 100 }), BENCH_PRESS, en, 'en', US_UNITS)).toBe('220.5 lb × 5');
    expect(formatResult(m({ reps: 5, loadKg: 100 }), BENCH_PRESS, uk, 'uk', US_UNITS)).toBe('220,5 фунта × 5');
  });

  it('shows a load typed in pounds as the round number it was', () => {
    expect(formatResult(m({ reps: 5, loadKg: 225 * 0.45359237 }), BENCH_PRESS, en, 'en', US_UNITS)).toBe('225 lb × 5');
  });

  it('leaves a number of the person’s own in the unit they gave it', () => {
    expect(formatResult(m({ value: 100 }), SQUATS, en, 'en', US_UNITS)).toBe('100 кг');
  });

  it('writes a weight goal in pounds and the rest as before', () => {
    expect(formatGoal(102.5, BENCH_PRESS, en, 'en', US_UNITS)).toBe('226 lb');
    expect(formatGoal(20, PULLUPS, en, 'en', US_UNITS)).toBe('20');
    expect(formatGoal(1_200_000, RUN, en, 'en', US_UNITS)).toBe('20:00');
  });
});

describe('formatWeight', () => {
  it('writes kilograms with up to two decimals', () => {
    expect(formatWeight(81.25, 'kg', uk, 'uk')).toBe('81,25 кг');
    expect(formatWeight(78.4, 'kg', en, 'en')).toBe('78.4 kg');
  });

  it.each([
    [1, '1 фунт'],
    [2, '2 фунти'],
    [4, '4 фунти'],
    [5, '5 фунтів'],
    [11, '11 фунтів'],
    [12, '12 фунтів'],
    [21, '21 фунт'],
    [22, '22 фунти'],
    [100, '100 фунтів'],
    [1.5, '1,5 фунта'],
    [181.9, '181,9 фунта'],
  ])('declines %s pounds in Ukrainian', (pounds, text) => {
    expect(formatWeight(pounds * 0.45359237, 'lb', uk, 'uk')).toBe(text);
  });

  it('picks the form from the number as shown, after rounding', () => {
    // 0.99996 lb shows as "1", so it is "1 фунт", not "1 фунта".
    expect(formatWeight(0.99996 * 0.45359237, 'lb', uk, 'uk')).toBe('1 фунт');
  });

  it('writes pounds with one decimal in English', () => {
    expect(formatWeight(82.5, 'lb', en, 'en')).toBe('181.9 lb');
    expect(formatWeight(0.45359237, 'lb', en, 'en')).toBe('1 lb');
  });
});

describe('formatLength', () => {
  it('writes centimetres as they are', () => {
    expect(formatLength(81.5, 'cm', uk, 'uk')).toBe('81,5 см');
  });

  it.each([
    [32, '32 дюйми'],
    [31, '31 дюйм'],
    [35, '35 дюймів'],
    [31.9, '31,9 дюйма'],
  ])('declines %s inches in Ukrainian', (inches, text) => {
    expect(formatLength(inches * 2.54, 'in', uk, 'uk')).toBe(text);
  });

  it('writes inches with one decimal in English', () => {
    expect(formatLength(81, 'in', en, 'en')).toBe('31.9 in');
  });
});

describe('fields', () => {
  it('hold the number alone, in the chosen unit', () => {
    expect(weightField(82.5, 'kg', 'uk')).toBe('82,5');
    expect(weightField(82.5, 'lb', 'en')).toBe('181.9');
    expect(weightField(20.4116655, 'lb', 'en')).toBe('45');
    expect(lengthField(81.28, 'in', 'uk')).toBe('32');
    expect(lengthField(181, 'cm', 'en')).toBe('181');
  });
});

describe('formatElapsed', () => {
  const span = (years: number, months: number, days: number, totalDays = 1) => ({ years, months, days, totalDays });

  it('uses the plural forms of the language', () => {
    expect(formatElapsed(span(3, 9, 22), uk)).toBe('3 роки 9 місяців 22 дні');
    expect(formatElapsed(span(1, 1, 1), uk)).toBe('1 рік 1 місяць 1 день');
    expect(formatElapsed(span(5, 2, 11), uk)).toBe('5 років 2 місяці 11 днів');
    expect(formatElapsed(span(1, 2, 1), en)).toBe('1 year 2 months 1 day');
  });

  it('leaves out the parts that are zero, but not everything', () => {
    expect(formatElapsed(span(2, 0, 0), en)).toBe('2 years');
    expect(formatElapsed(span(0, 0, 12), en)).toBe('12 days');
    expect(formatElapsed(span(0, 0, 0, 0), uk)).toBe('0 днів');
  });
});
