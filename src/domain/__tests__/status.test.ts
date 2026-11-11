import { PULLUPS, PUSHUPS } from '../exercises';
import { sportStatus, STATUS_LEVELS, STATUS_WINDOW_DAYS } from '../status';

import { entry, history, resetSequence } from './support';

beforeEach(resetSequence);

const TODAY = '2026-11-12';
const weights = [{ date: '2026-01-01', kg: 80 }];

/** The status after one pull-up set of `reps` with `loadKg` at 80 kg of body weight. */
const after = (reps: number, loadKg = 0) =>
  sportStatus(history([entry(PULLUPS, '2026-10-01', { reps, loadKg })], { weights }), TODAY);

describe('sportStatus', () => {
  it('needs a body weight first', () => {
    expect(sportStatus(history([entry(PULLUPS, '2026-10-01', { reps: 10 })]), TODAY)).toEqual({ state: 'needsBodyWeight' });
  });

  it('needs a pull-up set in the last 90 days', () => {
    expect(sportStatus(history([], { weights }), TODAY)).toEqual({ state: 'needsPullups' });
    expect(sportStatus(history([entry(PUSHUPS, '2026-10-01', { reps: 50 })], { weights }), TODAY)).toEqual({
      state: 'needsPullups',
    });
  });

  it('looks back exactly 90 days', () => {
    expect(STATUS_WINDOW_DAYS).toBe(90);
    // 90 days before 12 November is 14 August.
    const on = (date: string) => sportStatus(history([entry(PULLUPS, date, { reps: 10 })], { weights }), TODAY).state;

    expect(on('2026-08-14')).toBe('ranked');
    expect(on('2026-08-13')).toBe('needsPullups');
  });

  it('ranks by estimated one-rep max over body weight', () => {
    // 10 reps at 80 kg: 80 * (1 + 10/30) / 80 = 1.33.
    expect(after(10)).toEqual({
      state: 'ranked',
      level: 'athlete',
      coefficient: 1.33,
      progressPercent: expect.closeTo(43.33, 2),
      nextLevel: 'candidate',
      kgToNextLevel: 14,
      best: { reps: 10, loadKg: 0, date: '2026-10-01', repsCapped: false },
    });
  });

  // A level starts at its lower bound: 1.20 is already "athlete", 1.80 is already "elite".
  it.each([
    [1, 0, 'recruit', 1],
    [5, 0, 'recruit', 1.17],
    [6, 0, 'athlete', 1.2],
    [10, 9, 'athlete', 1.48],
    [10, 10, 'candidate', 1.5],
    [10, 27, 'candidate', 1.78],
    [10, 28, 'elite', 1.8],
    [10, 40, 'elite', 2],
  ] as const)('puts %i reps with +%i kg at "%s"', (reps, loadKg, level, coefficient) => {
    expect(after(reps, loadKg)).toMatchObject({ state: 'ranked', level, coefficient });
  });

  it('starts each level at its lower bound', () => {
    expect(STATUS_LEVELS.map((level) => [level.id, level.from, level.to])).toEqual([
      ['recruit', 1.0, 1.2],
      ['athlete', 1.2, 1.5],
      ['candidate', 1.5, 1.8],
      ['elite', 1.8, Infinity],
    ]);
  });

  it('has nowhere to go from the top level', () => {
    expect(after(10, 40)).toMatchObject({ level: 'elite', progressPercent: 100, nextLevel: null, kgToNextLevel: null });
  });

  it('counts reps above ten as ten and says so', () => {
    const status = after(25);
    expect(status).toMatchObject({ coefficient: 1.33, best: { reps: 25, repsCapped: true } });
  });

  it('picks the strongest set, not the longest one', () => {
    const status = sportStatus(
      history(
        [
          entry(PULLUPS, '2026-10-01', { reps: 20 }),
          entry(PULLUPS, '2026-10-05', { reps: 3, loadKg: 40 }),
          entry(PULLUPS, '2026-10-09', { reps: 8 }),
        ],
        { weights },
      ),
      TODAY,
    );
    // 3 reps with +40 kg: 120 * 1.1 / 80 = 1.65.
    expect(status).toMatchObject({ coefficient: 1.65, best: { reps: 3, loadKg: 40, date: '2026-10-05' } });
  });

  it('measures each set against the body weight of its own day', () => {
    const status = sportStatus(
      history([entry(PULLUPS, '2026-09-01', { reps: 10, loadKg: 20 }), entry(PULLUPS, '2026-11-01', { reps: 10, loadKg: 20 })], {
        weights: [
          { date: '2026-08-01', kg: 100 },
          { date: '2026-10-15', kg: 80 },
        ],
      }),
      TODAY,
    );
    // At 100 kg: 120 * 1.3333 / 100 = 1.6. At 80 kg: 100 * 1.3333 / 80 = 1.67.
    expect(status).toMatchObject({ coefficient: 1.67, best: { date: '2026-11-01' } });
  });

  it('says how many kilograms to the next level, by the current body weight and at least one', () => {
    // Coefficient 1.33, next level from 1.5, current weight 100 kg: (1.5 - 1.33) * 100 = 17.
    const heavier = sportStatus(
      history([entry(PULLUPS, '2026-10-01', { reps: 10 })], {
        weights: [...weights, { date: '2026-11-10', kg: 100 }],
      }),
      TODAY,
    );
    expect(heavier).toMatchObject({ coefficient: 1.33, kgToNextLevel: 17 });

    // 5 reps: 1.1667 rounds to 1.17, and (1.2 - 1.17) * 80 = 2.4, so 3 kg.
    expect(after(5)).toMatchObject({ kgToNextLevel: 3 });
  });

  it('puts one clean rep at the very bottom of the first level', () => {
    expect(after(1)).toMatchObject({ level: 'recruit', coefficient: 1, progressPercent: 0 });
  });

  it('ignores sets without reps', () => {
    expect(sportStatus(history([entry(PULLUPS, '2026-10-01', { text: 'багато' })], { weights }), TODAY)).toEqual({
      state: 'needsPullups',
    });
  });
});
