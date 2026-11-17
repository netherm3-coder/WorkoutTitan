import { BENCH_PRESS, customExercise, PULLUPS, RUN, SHUTTLE } from '../exercises';
import { progressSeries } from '../progress';
import { entry, history, minutes, resetSequence, seconds } from './support';

beforeEach(resetSequence);

const PLANK = customExercise({ id: 'custom:plank', name: 'Планка', kind: 'duration', better: 'higher' });
const ROPE = customExercise({ id: 'custom:rope', name: 'Скакалка', kind: 'count', unit: 'разів' });
const NOTES = customExercise({ id: 'custom:notes', name: 'Розтяжка', kind: 'text' });

describe('progressSeries', () => {
  it('gives every discipline its own line, the one logged last first', () => {
    const series = progressSeries(
      history([
        entry(PULLUPS, '2026-01-01', { reps: 10 }),
        entry(RUN, '2026-01-02', { distanceM: 5000, durationMs: minutes(25) }),
        entry(RUN, '2026-01-03', { distanceM: 3000, durationMs: minutes(14) }),
        entry(PULLUPS, '2026-01-04', { reps: 11 }),
      ]),
    );

    expect(series.map((item) => item.discipline)).toEqual(['pullups', 'run@3000', 'run@5000']);
    expect(series[0]).toMatchObject({ metric: 'headline', higherIsBetter: true, points: [{ value: 10 }, { value: 11 }] });
    expect(series[0]?.latest.date).toBe('2026-01-04');
  });

  it('keeps the best result of each day: the most reps, the shortest time', () => {
    const series = progressSeries(
      history([
        entry(PULLUPS, '2026-01-01', { reps: 8 }),
        entry(PULLUPS, '2026-01-01', { reps: 12 }),
        entry(PULLUPS, '2026-01-01', { reps: 10 }),
        entry(RUN, '2026-01-02', { distanceM: 5000, durationMs: minutes(26) }),
        entry(RUN, '2026-01-02', { distanceM: 5000, durationMs: minutes(24, 30) }),
      ]),
    );

    expect(series.find((item) => item.discipline === 'pullups')?.points).toEqual([{ date: '2026-01-01', value: 12 }]);
    expect(series.find((item) => item.discipline === 'run@5000')).toMatchObject({
      higherIsBetter: false,
      points: [{ date: '2026-01-02', value: minutes(24, 30) }],
    });
  });

  it('follows the added weight, as Record does, when most sets carry one', () => {
    const [series] = progressSeries(
      history([
        entry(PULLUPS, '2026-01-01', { reps: 5, loadKg: 20 }),
        entry(PULLUPS, '2026-01-02', { reps: 12 }),
        entry(PULLUPS, '2026-01-03', { reps: 4, loadKg: 30 }),
      ]),
    );

    // A set without weight counts as nothing added, not as its reps in kilograms.
    expect(series).toMatchObject({
      metric: 'addedLoad',
      higherIsBetter: true,
      points: [{ value: 20 }, { value: 0 }, { value: 30 }],
    });
  });

  it('follows the reps when weight is the exception', () => {
    const [series] = progressSeries(
      history([
        entry(PULLUPS, '2026-01-01', { reps: 10 }),
        entry(PULLUPS, '2026-01-02', { reps: 6, loadKg: 10 }),
        entry(PULLUPS, '2026-01-03', { reps: 11 }),
      ]),
    );

    expect(series).toMatchObject({ metric: 'headline', points: [{ value: 10 }, { value: 6 }, { value: 11 }] });
  });

  it('plots the headline number of every kind of exercise', () => {
    const series = progressSeries(
      history(
        [
          entry(BENCH_PRESS, '2026-01-01', { reps: 3, loadKg: 90 }),
          entry(SHUTTLE, '2026-01-02', { segments: 10, distanceM: 10, durationMs: seconds(28) }),
          entry(PLANK, '2026-01-03', { durationMs: seconds(90) }),
          entry(ROPE, '2026-01-04', { value: 300 }),
        ],
        { custom: [PLANK, ROPE] },
      ),
    );

    expect(series.map(({ discipline, higherIsBetter, points }) => ({ discipline, higherIsBetter, value: points[0]?.value }))).toEqual([
      { discipline: 'custom:rope', higherIsBetter: true, value: 300 },
      { discipline: 'custom:plank', higherIsBetter: true, value: seconds(90) },
      { discipline: 'shuttle@10x10', higherIsBetter: false, value: seconds(28) },
      { discipline: 'benchPress', higherIsBetter: true, value: 90 },
    ]);
  });

  it('leaves out free text and entries whose exercise is gone', () => {
    const series = progressSeries(
      history(
        [
          entry(NOTES, '2026-01-01', { text: 'легко' }),
          entry('custom:deleted', '2026-01-02', { value: 5 }),
          entry(PULLUPS, '2026-01-03', { reps: 9 }),
        ],
        { custom: [NOTES] },
      ),
    );

    expect(series.map((item) => item.discipline)).toEqual(['pullups']);
  });

  it('has nothing to show without results', () => {
    expect(progressSeries(history([]))).toEqual([]);
  });
});
