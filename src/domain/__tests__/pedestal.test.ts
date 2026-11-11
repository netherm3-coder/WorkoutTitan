import { customExercise, BENCH_PRESS, PULLUPS, PUSHUPS, RUN, SHUTTLE } from '../exercises';
import { chronological, rankEntries } from '../history';
import { buildPedestal, daysStanding, improvementCounts, personalBestIds } from '../pedestal';

import { entry, history, minutes, resetSequence, seconds } from './support';

beforeEach(resetSequence);

const NOTES = customExercise({ id: 'custom:notes', name: 'Нотатки', kind: 'text' });
const weights = [{ date: '2026-01-01', kg: 80 }];

describe('chronological', () => {
  it('puts the oldest first and keeps the order of writing within a day', () => {
    const second = entry(PULLUPS, '2026-03-02', { reps: 9 }, { id: 'b', createdAt: 2000 });
    const first = entry(PULLUPS, '2026-03-02', { reps: 8 }, { id: 'a', createdAt: 1000 });
    const earlier = entry(PULLUPS, '2026-03-01', { reps: 7 }, { id: 'z', createdAt: 9000 });
    const tied = entry(PULLUPS, '2026-03-02', { reps: 10 }, { id: 'c', createdAt: 2000 });

    const input = [tied, second, first, earlier];
    expect(chronological(input).map((item) => item.id)).toEqual(['z', 'a', 'b', 'c']);
    expect(input.map((item) => item.id)).toEqual(['c', 'b', 'a', 'z']);
  });
});

describe('rankEntries', () => {
  it('scores each set with the body weight of its own day', () => {
    const ranked = rankEntries(
      history([entry(PULLUPS, '2026-02-01', { reps: 10 }), entry(PULLUPS, '2026-07-01', { reps: 10 })], {
        weights: [
          { date: '2026-01-01', kg: 70 },
          { date: '2026-06-01', kg: 90 },
        ],
      }),
    );

    expect(ranked.map((item) => item.score)).toEqual([70 * (1 + 10 / 30), 90 * (1 + 10 / 30)]);
  });

  it('assumes 75 kg until something has been weighed', () => {
    const [ranked] = rankEntries(history([entry(PULLUPS, '2026-02-01', { reps: 1 })]));
    expect(ranked?.score).toBe(75);
  });

  it('leaves out entries of an exercise that no longer exists', () => {
    const ranked = rankEntries(history([entry('custom:deleted', '2026-02-01', { value: 5 }), entry(PULLUPS, '2026-02-01', { reps: 5 })]));
    expect(ranked.map((item) => item.exercise.id)).toEqual(['pullups']);
  });
});

describe('buildPedestal', () => {
  it('is empty without results', () => {
    expect(buildPedestal(history([])).size).toBe(0);
  });

  it('keeps the best result of every discipline', () => {
    const pedestal = buildPedestal(
      history(
        [
          entry(PULLUPS, '2026-02-01', { reps: 10 }),
          entry(PULLUPS, '2026-03-01', { reps: 14 }, { id: 'best-pullups' }),
          entry(PULLUPS, '2026-04-01', { reps: 12 }),
          entry(RUN, '2026-02-01', { distanceM: 5000, durationMs: minutes(26) }),
          entry(RUN, '2026-03-01', { distanceM: 5000, durationMs: minutes(24, 30) }, { id: 'best-5k' }),
          entry(RUN, '2026-03-05', { distanceM: 3000, durationMs: minutes(14) }, { id: 'best-3k' }),
        ],
        { weights },
      ),
    );

    expect([...pedestal.keys()].sort()).toEqual(['pullups', 'run@3000', 'run@5000']);
    expect(pedestal.get('pullups')?.entry.id).toBe('best-pullups');
    expect(pedestal.get('run@5000')?.entry.id).toBe('best-5k');
    expect(pedestal.get('run@3000')?.entry.id).toBe('best-3k');
  });

  it('leaves the title with whoever set an equal result first', () => {
    const pedestal = buildPedestal(
      history([entry(PULLUPS, '2026-02-01', { reps: 12 }, { id: 'first' }), entry(PULLUPS, '2026-05-01', { reps: 12 })], { weights }),
    );
    expect(pedestal.get('pullups')?.entry.id).toBe('first');
  });

  it('does not depend on the order the entries are stored in', () => {
    const entries = [
      entry(PULLUPS, '2026-02-01', { reps: 12 }, { id: 'first' }),
      entry(PULLUPS, '2026-05-01', { reps: 12 }, { id: 'later' }),
      entry(PULLUPS, '2026-03-01', { reps: 9 }),
    ];
    const forward = buildPedestal(history(entries, { weights }));
    const backward = buildPedestal(history([...entries].reverse(), { weights }));

    expect(backward.get('pullups')).toEqual(forward.get('pullups'));
  });

  it('tracks the peak apart from the record: most reps ever against the strongest set', () => {
    const pedestal = buildPedestal(
      history(
        [
          entry(PULLUPS, '2026-02-01', { reps: 15 }),
          entry(PULLUPS, '2026-03-01', { reps: 5, loadKg: 40 }, { id: 'weighted' }),
          entry(PULLUPS, '2026-04-01', { reps: 16 }),
        ],
        { weights },
      ),
    );

    // 5 reps with +40 kg: 120 * (1 + 5/30) = 140. 16 clean reps: 80 * (1 + 16/30) = 122.7.
    expect(pedestal.get('pullups')).toMatchObject({ entry: { id: 'weighted' }, peak: 16 });
    expect(pedestal.get('pullups')?.score).toBeCloseTo(140, 10);
  });

  it('keeps the fastest time as the peak of a race', () => {
    const pedestal = buildPedestal(
      history([
        entry(SHUTTLE, '2026-02-01', { segments: 4, distanceM: 9, durationMs: seconds(10.2) }),
        entry(SHUTTLE, '2026-03-01', { segments: 4, distanceM: 9, durationMs: seconds(9.8) }),
        entry(SHUTTLE, '2026-04-01', { segments: 4, distanceM: 9, durationMs: seconds(10) }),
      ]),
    );
    expect(pedestal.get('shuttle@4x9')?.peak).toBe(9800);
  });

  it('estimates a one-rep max for bodyweight records once a weight is known', () => {
    const entries = [entry(PULLUPS, '2026-02-01', { reps: 12, loadKg: 20 })];

    expect(buildPedestal(history(entries, { weights })).get('pullups')?.oneRepMaxKg).toBe(53.3);
    expect(buildPedestal(history(entries)).get('pullups')?.oneRepMaxKg).toBeNull();
  });

  it('estimates a one-rep max for lifts as the weight on the bar', () => {
    const pedestal = buildPedestal(history([entry(BENCH_PRESS, '2026-02-01', { reps: 5, loadKg: 100 })]));
    expect(pedestal.get('benchPress')).toMatchObject({ oneRepMaxKg: 116.7, peak: 100 });
  });

  it('gives races no one-rep max', () => {
    const pedestal = buildPedestal(history([entry(RUN, '2026-02-01', { distanceM: 5000, durationMs: minutes(25) })], { weights }));
    expect(pedestal.get('run@5000')?.oneRepMaxKg).toBeNull();
  });

  it('skips results that cannot be ranked', () => {
    const pedestal = buildPedestal(
      history([entry(NOTES, '2026-02-01', { text: 'легко' }), entry(PULLUPS, '2026-02-01', { text: 'багато' })], {
        custom: [NOTES],
      }),
    );
    expect(pedestal.size).toBe(0);
  });
});

describe('personalBestIds', () => {
  it('marks the results that beat everything before them', () => {
    const ids = personalBestIds(
      history(
        [
          entry(PULLUPS, '2026-02-01', { reps: 10 }, { id: 'first' }),
          entry(PULLUPS, '2026-02-05', { reps: 9 }, { id: 'worse' }),
          entry(PULLUPS, '2026-02-09', { reps: 10 }, { id: 'equal' }),
          entry(PULLUPS, '2026-02-12', { reps: 11 }, { id: 'better' }),
          entry(PUSHUPS, '2026-02-12', { reps: 30 }, { id: 'other-exercise' }),
          entry(RUN, '2026-02-13', { distanceM: 5000, durationMs: minutes(26) }, { id: 'run-first' }),
          entry(RUN, '2026-02-20', { distanceM: 5000, durationMs: minutes(25) }, { id: 'run-faster' }),
          entry(RUN, '2026-02-25', { distanceM: 5000, durationMs: minutes(27) }, { id: 'run-slower' }),
        ],
        { weights },
      ),
    );

    expect([...ids].sort()).toEqual(['better', 'first', 'other-exercise', 'run-faster', 'run-first']);
  });

  it('judges by the day of the workout, not by when it was written down', () => {
    const ids = personalBestIds(
      history(
        [entry(PULLUPS, '2026-03-01', { reps: 12 }, { id: 'march' }), entry(PULLUPS, '2026-02-01', { reps: 10 }, { id: 'february' })],
        { weights },
      ),
    );
    expect([...ids].sort()).toEqual(['february', 'march']);
  });
});

describe('improvementCounts', () => {
  it('counts how many times each record was beaten after it was first set', () => {
    const counts = improvementCounts(
      history(
        [
          entry(PULLUPS, '2026-02-01', { reps: 10 }),
          entry(PULLUPS, '2026-02-05', { reps: 11 }),
          entry(PULLUPS, '2026-02-09', { reps: 11 }),
          entry(PULLUPS, '2026-02-12', { reps: 13 }),
          entry(PUSHUPS, '2026-02-12', { reps: 30 }),
        ],
        { weights },
      ),
    );

    expect(Object.fromEntries(counts)).toEqual({ pullups: 2, pushups: 0 });
  });
});

describe('daysStanding', () => {
  it('counts the days since the record was set, never below zero', () => {
    const pedestal = buildPedestal(history([entry(PULLUPS, '2026-11-01', { reps: 10 })]));
    const record = pedestal.get('pullups');
    if (!record) throw new Error('expected a record');

    expect(daysStanding(record, '2026-11-12')).toBe(11);
    expect(daysStanding(record, '2026-11-01')).toBe(0);
    expect(daysStanding(record, '2026-10-20')).toBe(0);
  });
});
