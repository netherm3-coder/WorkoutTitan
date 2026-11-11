import { entryProblems, NO_MEASURES, type Measures } from '../entry';
import { BENCH_PRESS, customExercise, PULLUPS, RUN, SHUTTLE } from '../exercises';

const m = (measures: Partial<Measures>): Measures => ({ ...NO_MEASURES, ...measures });

const HOLD = customExercise({ id: 'hold', name: 'Планка', kind: 'duration' });
const COUNT = customExercise({ id: 'count', name: 'Присідання', kind: 'count' });
const TEXT = customExercise({ id: 'text', name: 'Нотатки', kind: 'text' });

describe('entryProblems', () => {
  it('finds nothing wrong with complete results', () => {
    expect(entryProblems(m({ reps: 12 }), PULLUPS)).toEqual([]);
    expect(entryProblems(m({ reps: 12, loadKg: 20, durationMs: 41_000 }), PULLUPS)).toEqual([]);
    expect(entryProblems(m({ reps: 5, loadKg: 100 }), BENCH_PRESS)).toEqual([]);
    expect(entryProblems(m({ distanceM: 5000, durationMs: 1_470_000 }), RUN)).toEqual([]);
    expect(entryProblems(m({ segments: 4, distanceM: 9, durationMs: 9_800 }), SHUTTLE)).toEqual([]);
    expect(entryProblems(m({ durationMs: 120_000 }), HOLD)).toEqual([]);
    expect(entryProblems(m({ value: 0 }), COUNT)).toEqual([]);
    expect(entryProblems(m({ text: 'легко' }), TEXT)).toEqual([]);
  });

  it.each([null, 0, -3, NaN, Infinity])('asks for reps when they are %s', (reps) => {
    expect(entryProblems(m({ reps }), PULLUPS)).toEqual(['repsRequired']);
  });

  it('accepts no extra load but not a negative one', () => {
    expect(entryProblems(m({ reps: 10, loadKg: 0 }), PULLUPS)).toEqual([]);
    expect(entryProblems(m({ reps: 10, loadKg: -5 }), PULLUPS)).toEqual(['negativeLoad']);
  });

  it('asks a lift for both the weight and the reps', () => {
    expect(entryProblems(m({}), BENCH_PRESS)).toEqual(['loadRequired', 'repsRequired']);
    expect(entryProblems(m({ loadKg: 100 }), BENCH_PRESS)).toEqual(['repsRequired']);
    expect(entryProblems(m({ reps: 5, loadKg: 0 }), BENCH_PRESS)).toEqual(['loadRequired']);
  });

  it('asks a run for a distance and a time', () => {
    expect(entryProblems(m({}), RUN)).toEqual(['distanceRequired', 'durationRequired']);
    expect(entryProblems(m({ distanceM: 5000, durationMs: 0 }), RUN)).toEqual(['durationRequired']);
  });

  it('asks a shuttle run for its scheme and a time', () => {
    expect(entryProblems(m({}), SHUTTLE)).toEqual(['segmentsRequired', 'distanceRequired', 'durationRequired']);
    expect(entryProblems(m({ segments: 4, durationMs: 9_800 }), SHUTTLE)).toEqual(['distanceRequired']);
  });

  it('asks a timed exercise for a time', () => {
    expect(entryProblems(m({ value: 5 }), HOLD)).toEqual(['durationRequired']);
  });

  it('asks a count for a real number', () => {
    expect(entryProblems(m({}), COUNT)).toEqual(['valueRequired']);
    expect(entryProblems(m({ value: NaN }), COUNT)).toEqual(['valueRequired']);
  });

  it('asks a result in words for some words', () => {
    expect(entryProblems(m({ text: '   ' }), TEXT)).toEqual(['textRequired']);
    expect(entryProblems(m({ reps: 5 }), TEXT)).toEqual(['textRequired']);
  });
});
