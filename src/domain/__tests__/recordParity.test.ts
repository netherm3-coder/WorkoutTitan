import createRecordReference from '../../../legacy/record/reference';
import { gatherFacts } from '../achievements';
import { bodyWeightAt, type WeightRecord } from '../bodyWeight';
import { exerciseLookup } from '../exercises';
import { goalProgress } from '../goals';
import { chronological, rankEntries, type History } from '../history';
import { convertLegacyWorkouts } from '../legacy/convert';
import { buildPedestal, personalBestIds } from '../pedestal';
import { sportStatus, type StatusLevelId } from '../status';
import { oneRepMaxAddedKg } from '../strength';
import { lifetimeTotals } from '../totals';

import { familyOf, makeRecordHistory, RECORD_WEIGHTS, type Family, type RecordWorkout } from './recordDataset';

/**
 * The same history is given to Record's own code and to the new one, and the answers are
 * compared. Where the new code differs on purpose, `recordDifferences.test.ts` says how.
 */

type Setup = {
  /** Record's side: migrated workouts, oldest first. */
  workouts: RecordWorkout[];
  record: ReturnType<typeof createRecordReference>;
  history: History;
  /** Discipline of every workout on the new side, by workout id. */
  disciplineOf: Map<string, string>;
  scoreOf: Map<string, number | null>;
};

function setUp(source: readonly RecordWorkout[], recordWeights = RECORD_WEIGHTS): Setup {
  const record = createRecordReference(recordWeights);
  const weights: WeightRecord[] = recordWeights.map(({ date, weight }) => ({ date, kg: weight }));

  const conversion = convertLegacyWorkouts(source, {
    newId: () => {
      throw new Error('every workout has an id');
    },
  });
  expect(conversion.skipped).toEqual([]);
  expect(conversion.entries.flatMap((item) => item.issues)).toEqual([]);

  const history: History = {
    entries: conversion.entries.map((item) => item.entry),
    exercises: exerciseLookup(conversion.exercises),
    weights,
  };

  const byId = new Map(source.map((workout) => [workout.id, workout]));
  const workouts = chronological(history.entries).map((entry) => {
    const workout = byId.get(entry.id);
    if (!workout) throw new Error(`lost ${entry.id}`);
    return record.migrateWorkout(workout);
  });

  const ranked = rankEntries(history);
  return {
    workouts,
    record,
    history,
    disciplineOf: new Map(ranked.map((item) => [item.entry.id, item.discipline])),
    scoreOf: new Map(ranked.map((item) => [item.entry.id, item.score])),
  };
}

const groupBy = <T>(items: readonly T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
};

const only = (workouts: readonly RecordWorkout[], ...families: Family[]) =>
  workouts.filter((workout) => families.includes(familyOf(workout.exercise)));

/** Kinds of results that Record and the new code rank by the very same number. */
const SAME_SCORE: Family[] = ['classic', 'race', 'customTime', 'customDistance'];

const SEEDS = [1, 2026, 77_777];
const SIZE = 400;

describe.each(SEEDS)('against Record, history %i', (seed) => {
  const { workouts, record, history, disciplineOf, scoreOf } = setUp(makeRecordHistory(seed, SIZE));

  it('has every format Record wrote', () => {
    const names = new Set(workouts.map((workout) => workout.exercise));
    for (const name of [
      'Підтягування',
      'Відтискання',
      'Бруси',
      'Біг 5 км',
      'Спринт 100 м',
      'Човниковий біг 4×9м',
      'Човниковий біг 10х10',
      'Присідання',
      'Смуга перешкод',
      'Марш-кидок 30 км',
      'Жим лежачи',
    ]) {
      expect(names).toContain(name);
    }
  });

  it('groups results into the same disciplines', () => {
    const disciplinesByName = groupBy(workouts, (workout) => workout.exercise);
    const seen = new Map<string, string>();

    for (const [name, group] of disciplinesByName) {
      const disciplines = new Set(group.map((workout) => disciplineOf.get(workout.id)));
      expect({ name, disciplines: disciplines.size }).toEqual({ name, disciplines: 1 });

      const [discipline] = disciplines;
      expect(seen.has(discipline ?? '')).toBe(false);
      seen.set(discipline ?? '', name);
    }
  });

  it('gives every result the index Record gave it', () => {
    const compared = only(workouts, ...SAME_SCORE);
    expect(compared.length).toBeGreaterThan(300);

    for (const workout of compared) {
      const index = record.calculateIndex(workout.count, workout.date, workout.exercise);
      expect({ id: workout.id, score: scoreOf.get(workout.id) }).toEqual({
        id: workout.id,
        score: expect.closeTo(index, 9),
      });
    }
  });

  it('estimates the same one-rep max', () => {
    for (const workout of only(workouts, 'classic')) {
      const entry = history.entries.find((item) => item.id === workout.id);
      const bodyWeightKg = bodyWeightAt(workout.date, history.weights);
      if (!entry || entry.reps === null || bodyWeightKg === null) throw new Error(`cannot check ${workout.id}`);

      expect({ id: workout.id, kg: oneRepMaxAddedKg(entry.reps, entry.loadKg ?? 0, bodyWeightKg) }).toEqual({
        id: workout.id,
        kg: record.calculate1RM(workout.count, workout.date),
      });
    }
  });

  it('adds up the same lifetime totals', () => {
    const stats: Record<string, number> = {};
    for (const workout of workouts) {
      const { key, val } = record.getStatUpdateData(workout.exercise, workout.count);
      stats[key] = (stats[key] ?? 0) + val;
    }

    const totals = lifetimeTotals(history);
    expect(totals.pullups).toBe(stats['Підтягування']);
    expect(totals.pushups).toBe(stats['Відтискання']);
    expect(totals.dips).toBe(stats['Бруси']);
    expect(totals.runKm).toBeCloseTo(stats['Біг'] ?? NaN, 9);
    expect(totals.otherEntries).toBe(stats.otherSets);
  });

  it('puts the same results on the pedestal', () => {
    const pedestal = buildPedestal(history);
    const groups = groupBy(only(workouts, ...SAME_SCORE), (workout) => workout.exercise);
    expect(groups.size).toBeGreaterThan(10);

    for (const [name, group] of groups) {
      const theirs = record._pedestalEntryFrom(group, name);
      const mine = pedestal.get(disciplineOf.get(group[0]?.id ?? '') ?? '');
      if (!theirs || !mine) throw new Error(`no record for ${name}`);

      const source = workouts.find((workout) => workout.id === mine.entry.id);
      expect({ name, count: source?.count, date: mine.entry.date }).toEqual({ name, count: theirs.count, date: theirs.date });

      const family = familyOf(name);
      if (family === 'classic') {
        // Most reps ever, and the estimated one-rep max of the record itself.
        expect({ name, peak: mine.peak }).toEqual({ name, peak: theirs.absoluteMaxReps });
        expect({ name, kg: mine.oneRepMaxKg }).toEqual({ name, kg: theirs.max1RM });
      } else if (family === 'race') {
        // The best time, which Record keeps in seconds.
        expect({ name, peak: (mine.peak ?? NaN) / 1000 }).toEqual({ name, peak: expect.closeTo(theirs.absoluteMaxReps, 9) });
      }
    }
  });

  it('marks the same results as personal bests', () => {
    const compared = new Set(only(workouts, ...SAME_SCORE).map((workout) => workout.id));
    const theirs = [...record.personalBestIds([...workouts].reverse())].filter((id) => compared.has(id));
    const mine = [...personalBestIds(history)].filter((id) => compared.has(id));

    expect(mine.length).toBeGreaterThan(20);
    expect([...mine].sort()).toEqual([...theirs].sort());
  });

  it('measures progress toward a goal the same way', () => {
    const pedestal = buildPedestal(history);
    const groups = groupBy(only(workouts, 'classic', 'race'), (workout) => workout.exercise);

    for (const [name, group] of groups) {
      const theirs = record._pedestalEntryFrom(group, name);
      const mine = pedestal.get(disciplineOf.get(group[0]?.id ?? '') ?? '');
      if (!theirs || !mine) throw new Error(`no record for ${name}`);

      const isRace = familyOf(name) === 'race';
      // Record keeps goals for times in seconds; here they are in milliseconds.
      for (const goal of isRace ? [8, 12.5, 60, 600, 1500, 3000] : [5, 15, 30, 100]) {
        expect({ name, goal, percent: goalProgress(mine, isRace ? goal * 1000 : goal) }).toEqual({
          name,
          goal,
          percent: record.goalPercent(name, theirs, goal),
        });
      }
    }
  });

  it('counts the same things for achievements', () => {
    const facts = gatherFacts(history, null);

    expect(facts.entries).toBe(workouts.length);
    expect(facts.maxEntriesInMonth).toBe(record.maxRecordsInMonth(workouts));
    expect(facts.maxEntriesInDiscipline).toBe(record.maxRecordsPerExercise(workouts));
    expect(facts.cameBack).toBe(record.hasComeback(workouts));
    expect(facts.spanDays).toBeCloseTo(record.spanInMonths(workouts) * 30, 6);
    expect(facts.totalKm).toBeCloseTo(record.totalKm(workouts), 9);
    expect(facts.best1kmRunMs).toBe(record.bestSecFor(workouts, 'Біг 1 км') * 1000);
    expect(facts.best3kmRunMs).toBe(record.bestSecFor(workouts, 'Біг 3 км') * 1000);
    expect(facts.maxBenchKg).toBe(record.maxWeightFor(workouts, 'Жим лежачи'));
    expect(facts.disciplines).toBe(new Set(workouts.map((workout) => workout.exercise)).size);
    expect(facts.maxPullupReps).toBe(
      Math.max(...workouts.filter((workout) => workout.exercise === 'Підтягування').map((workout) => parseInt(workout.count, 10))),
    );
  });
});

describe('against Record, with a body weight that never changes', () => {
  // Record mixes body weight into the index of a custom number. While the weight stands still
  // that does not change the order, so the same result must come out on top.
  const { workouts, record, history, disciplineOf } = setUp(makeRecordHistory(5, SIZE), [{ date: '2025-01-01', weight: 80 }]);

  it('puts the same custom number on the pedestal', () => {
    const group = only(workouts, 'customNumber');
    const theirs = record._pedestalEntryFrom(group, 'Присідання');
    const mine = buildPedestal(history).get(disciplineOf.get(group[0]?.id ?? '') ?? '');
    if (!theirs || !mine) throw new Error('expected a record on both sides');

    expect(group.length).toBeGreaterThan(10);
    expect(workouts.find((workout) => workout.id === mine.entry.id)).toMatchObject({ count: theirs.count, date: theirs.date });
    expect(mine.peak).toBe(theirs.absoluteMaxReps);
  });
});

describe('against Record, the sport status', () => {
  const LEVELS: Record<string, StatusLevelId> = { Рекрут: 'recruit', Атлет: 'athlete', КМС: 'candidate', Еліта: 'elite' };

  afterEach(() => {
    jest.useRealTimers();
  });

  // Timed sets are fine here: the status reads only the reps and the load.
  const pullups = (date: string, count: string, index: number): RecordWorkout => ({
    id: `p${index}`,
    exercise: 'Підтягування',
    count,
    date,
    createdAt: index + 1,
  });

  const sets = [
    pullups('2026-03-02', '18', 0),
    pullups('2026-04-11', '8 (+20 кг)', 1),
    pullups('2026-05-20', '3 (+45 кг)', 2),
    pullups('2026-06-15', '12 (0:41)', 3),
    pullups('2026-07-04', '10 (+10 кг) (1:05)', 4),
    pullups('2026-08-14', '1 (+50 кг)', 5),
    pullups('2026-09-09', '25', 6),
    pullups('2026-10-01', '6 (+32,5 кг)', 7),
    pullups('2026-10-30', '9', 8),
  ];

  it.each([
    '2026-03-02',
    '2026-04-30',
    '2026-06-01',
    '2026-07-10',
    '2026-08-18',
    '2026-09-10',
    '2026-11-12',
    '2026-12-31',
    '2027-01-28',
    '2027-01-29',
  ])('is the same on %s', (today) => {
    const [year, month, day] = today.split('-').map(Number);
    jest.useFakeTimers({ now: new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12) });

    const { record, history, workouts } = setUp(sets);
    const theirs = record.sportStatus(workouts);
    const mine = sportStatus(history, today);

    if (theirs === null) {
      expect(mine).toEqual({ state: 'needsPullups' });
      return;
    }
    expect(mine).toEqual({
      state: 'ranked',
      level: LEVELS[theirs.level],
      coefficient: theirs.coef,
      progressPercent: expect.closeTo(theirs.percent, 9),
      nextLevel: theirs.nextLevel === null ? null : LEVELS[theirs.nextLevel],
      kgToNextLevel: theirs.kg,
      best: { reps: theirs.best.reps, loadKg: theirs.best.added, date: theirs.best.date, repsCapped: theirs.best.reps > 10 },
    });
  });

  it('is asked for a body weight first, as in Record', () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 12, 12) });
    const { record, history, workouts } = setUp(sets, []);

    expect(record.sportStatus(workouts)).toBeNull();
    expect(sportStatus(history, '2026-11-12')).toEqual({ state: 'needsBodyWeight' });
  });
});
