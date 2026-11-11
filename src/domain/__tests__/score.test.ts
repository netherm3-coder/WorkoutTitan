import { NO_MEASURES, type Measures } from '../entry';
import { BENCH_PRESS, customExercise, PULLUPS, RUN, SHUTTLE, SPRINT } from '../exercises';
import { headlineHigherIsBetter, headlineOf, scoreOf } from '../score';

const m = (measures: Partial<Measures>): Measures => ({ ...NO_MEASURES, ...measures });

const RACE = customExercise({ id: 'race', name: 'Смуга перешкод', kind: 'duration' });
const HOLD = customExercise({ id: 'hold', name: 'Планка', kind: 'duration', better: 'higher' });
const SQUATS = customExercise({ id: 'squats', name: 'Присідання', kind: 'count' });
const GOLF = customExercise({ id: 'golf', name: 'Удари', kind: 'count', better: 'lower' });
const NOTES = customExercise({ id: 'notes', name: 'Нотатки', kind: 'text' });

describe('scoreOf', () => {
  it('ranks bodyweight sets by total weight moved, scaled by reps', () => {
    expect(scoreOf(m({ reps: 12, loadKg: 20 }), PULLUPS, 80)).toBeCloseTo(140, 10);
    expect(scoreOf(m({ reps: 12 }), PULLUPS, 80)).toBeCloseTo(112, 10);
  });

  it('lets a heavier body make the same set worth more', () => {
    const light = scoreOf(m({ reps: 10 }), PULLUPS, 70) ?? 0;
    const heavy = scoreOf(m({ reps: 10 }), PULLUPS, 90) ?? 0;
    expect(heavy).toBeGreaterThan(light);
  });

  it('ranks lifts by estimated one-rep max, whatever the body weighs', () => {
    expect(scoreOf(m({ reps: 5, loadKg: 100 }), BENCH_PRESS, 80)).toBeCloseTo(116.667, 3);
    expect(scoreOf(m({ reps: 5, loadKg: 100 }), BENCH_PRESS, 60)).toBe(scoreOf(m({ reps: 5, loadKg: 100 }), BENCH_PRESS, 95));
  });

  it('ranks races by time: the faster, the higher', () => {
    expect(scoreOf(m({ durationMs: 1_470_000, distanceM: 5000 }), RUN, 80)).toBeCloseTo(10_000 / 1470, 10);
    expect(scoreOf(m({ durationMs: 12_500, distanceM: 100 }), SPRINT, 80)).toBe(800);
    expect(scoreOf(m({ durationMs: 24_500, distanceM: 10, segments: 10 }), SHUTTLE, 80)).toBeCloseTo(408.163, 3);
  });

  it('treats a bare time as a race unless the exercise says longer is better', () => {
    expect(scoreOf(m({ durationMs: 60_000 }), RACE, 80)).toBeGreaterThan(scoreOf(m({ durationMs: 90_000 }), RACE, 80) ?? 0);
    expect(scoreOf(m({ durationMs: 90_000 }), HOLD, 80)).toBeGreaterThan(scoreOf(m({ durationMs: 60_000 }), HOLD, 80) ?? 0);
  });

  it('ranks counts by the number, in the direction of the exercise', () => {
    expect(scoreOf(m({ value: 50 }), SQUATS, 80)).toBe(50);
    expect(scoreOf(m({ value: 70 }), GOLF, 80)).toBeGreaterThan(scoreOf(m({ value: 80 }), GOLF, 80) ?? 0);
  });

  it('ignores the time of a count: the number is what is ranked', () => {
    expect(scoreOf(m({ value: 50, durationMs: 41_200 }), SQUATS, 80)).toBe(50);
  });

  it.each([
    ['a set without reps', m({ loadKg: 20 }), PULLUPS],
    ['a set of zero reps', m({ reps: 0 }), PULLUPS],
    ['a lift without a weight', m({ reps: 5 }), BENCH_PRESS],
    ['a run without a time', m({ distanceM: 5000 }), RUN],
    ['a run in no time', m({ distanceM: 5000, durationMs: 0 }), RUN],
    ['a hold without a time', m({}), HOLD],
    ['a count without a number', m({}), SQUATS],
    ['a count of zero where less is better', m({ value: 0 }), GOLF],
    ['a result in words', m({ text: 'легко' }), NOTES],
    ['words in a numeric exercise', m({ text: 'багато' }), PULLUPS],
  ])('cannot rank %s', (_label, measures, exercise) => {
    expect(scoreOf(measures, exercise, 80)).toBeNull();
  });
});

describe('headlineOf', () => {
  it('is the number a goal is set in', () => {
    expect(headlineOf(m({ reps: 12, loadKg: 20 }), PULLUPS)).toBe(12);
    expect(headlineOf(m({ reps: 5, loadKg: 100 }), BENCH_PRESS)).toBe(100);
    expect(headlineOf(m({ durationMs: 1_470_000, distanceM: 5000 }), RUN)).toBe(1_470_000);
    expect(headlineOf(m({ durationMs: 90_000 }), HOLD)).toBe(90_000);
    expect(headlineOf(m({ value: 50 }), SQUATS)).toBe(50);
    expect(headlineOf(m({ text: 'легко' }), NOTES)).toBeNull();
  });
});

describe('headlineHigherIsBetter', () => {
  it('is false for anything timed against the clock', () => {
    expect([RUN, SPRINT, SHUTTLE, RACE, GOLF].map(headlineHigherIsBetter)).toEqual(Array(5).fill(false));
    expect([PULLUPS, BENCH_PRESS, HOLD, SQUATS].map(headlineHigherIsBetter)).toEqual(Array(4).fill(true));
  });
});
