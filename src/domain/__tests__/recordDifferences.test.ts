import createRecordReference from '../../../legacy/record/reference';
import { gatherFacts } from '../achievements';
import { exerciseLookup } from '../exercises';
import { goalProgress } from '../goals';
import type { History } from '../history';
import { convertLegacyWorkouts, type LegacyWorkout } from '../legacy/convert';
import { buildPedestal } from '../pedestal';

/**
 * Where the new code does not do what Record did, on purpose. Each case first shows Record's
 * answer, taken from its own code, and then the new one.
 */

type Row = [exercise: string, count: string, date: string];

function build(rows: readonly Row[], weights: readonly { date: string; kg: number }[] = []) {
  const workouts: (LegacyWorkout & { id: string })[] = rows.map(([exercise, count, date], index) => ({
    id: `w${index}`,
    exercise,
    count,
    date,
    createdAt: index + 1,
  }));
  const conversion = convertLegacyWorkouts(workouts, { newId: () => 'unused' });
  const history: History = {
    entries: conversion.entries.map((item) => item.entry),
    exercises: exerciseLookup(conversion.exercises),
    weights,
  };
  const record = createRecordReference(
    [...weights].sort((a, b) => b.date.localeCompare(a.date)).map(({ date, kg }) => ({ date, weight: kg })),
  );

  const pedestal = buildPedestal(history);
  /** The result standing on the pedestal of a discipline, as it was written. */
  const best = (discipline: string) => {
    const id = pedestal.get(discipline)?.entry.id;
    return workouts.find((workout) => workout.id === id)?.count;
  };

  return { workouts, conversion, history, record, pedestal, best };
}

const AT_80_KG = [{ date: '2026-01-01', kg: 80 }];

describe('differences from Record', () => {
  it('ranks a timed set by its reps; Record ranked it as a run, by its time', () => {
    const { workouts, record, best } = build(
      [
        ['Підтягування', '30', '2026-02-01'],
        ['Підтягування', '12 (0:41)', '2026-02-02'],
      ],
      AT_80_KG,
    );

    // Record takes "12 (0:41)" for an old-style run of 41 seconds, which outranks 30 clean reps.
    expect(record.calculateIndex('12 (0:41)', '2026-02-02', 'Підтягування')).toBeCloseTo(10_000 / 41, 9);
    expect(record._pedestalEntryFrom(workouts, 'Підтягування')?.count).toBe('12 (0:41)');

    expect(best('pullups')).toBe('30');
  });

  it('ranks a custom number by the number; Record mixed body weight into it', () => {
    const { workouts, record, best } = build(
      [
        ['Присідання', '100 кг', '2026-02-01'],
        ['Присідання', '95 кг', '2026-07-01'],
      ],
      [
        { date: '2026-01-01', kg: 70 },
        { date: '2026-06-01', kg: 80 },
      ],
    );

    // Record: 70 * (1 + 100/30) = 303 against 80 * (1 + 95/30) = 333, so 95 kg "beats" 100 kg.
    expect(record._pedestalEntryFrom(workouts, 'Присідання')?.count).toBe('95 кг');

    expect(best('custom:присідання')).toBe('100 кг');
  });

  it('ranks the bench press by the weight on the bar; Record added body weight to it', () => {
    const { workouts, record, best, conversion } = build(
      [
        ['Жим лежачи', '1 (+100 кг)', '2026-02-01'],
        ['Жим лежачи', '8 (+78 кг)', '2026-02-08'],
      ],
      AT_80_KG,
    );

    // Record: (80 + 78) * (1 + 8/30) = 200 against 80 + 100 = 180.
    expect(record._pedestalEntryFrom(workouts, 'Жим лежачи')?.count).toBe('8 (+78 кг)');

    // Here: 100 kg for one rep against an estimated 78 * (1 + 8/30) = 98.8 kg.
    expect(best('benchPress')).toBe('1 (+100 кг)');
    // And it is a built-in exercise now, not one of the person's own.
    expect(conversion.exercises).toEqual([]);
  });

  it('keeps old and new 10 x 10 shuttle runs in one discipline; Record kept two lists', () => {
    const { workouts, record, pedestal, best } = build([
      ['Човниковий біг', '10х10 м (24.5 с)', '2025-05-01'],
      ['Човниковий біг 10×10м', '0:25.10 (10×10м)', '2026-05-01'],
    ]);

    expect(new Set(workouts.map((workout) => record.migrateWorkout(workout).exercise))).toEqual(
      new Set(['Човниковий біг 10х10', 'Човниковий біг 10×10м']),
    );

    expect([...pedestal.keys()]).toEqual(['shuttle@10x10']);
    expect(best('shuttle@10x10')).toBe('10х10 м (24.5 с)');
  });

  it('keeps one distance in one discipline however it was typed', () => {
    const { pedestal } = build([
      ['Біг 5 км', '25:00 (5 км)', '2026-02-01'],
      ['Біг 5.0 км', '24:00 (5.0 км)', '2026-02-08'],
    ]);
    expect([...pedestal.keys()]).toEqual(['run@5000']);
  });

  it('gives an equal result to whoever set it first; Record gave it to whichever was stored first', () => {
    const { workouts, record, pedestal } = build([
      ['Відтискання', '40', '2026-03-01'],
      ['Відтискання', '40', '2026-02-01'],
    ]);

    expect(record._pedestalEntryFrom(workouts, 'Відтискання')?.date).toBe('2026-03-01');
    expect(record._pedestalEntryFrom([...workouts].reverse(), 'Відтискання')?.date).toBe('2026-02-01');

    expect(pedestal.get('pushups')?.entry.date).toBe('2026-02-01');
  });

  it('shows no one-rep max until a weight is recorded; Record assumed 75 kg', () => {
    const { record, pedestal } = build([['Підтягування', '10', '2026-02-01']]);

    expect(record.calculate1RM('10', '2026-02-01')).toBe(25);
    expect(pedestal.get('pullups')?.oneRepMaxKg).toBeNull();
  });

  it('keeps fractions of a second in old runs; Record dropped them', () => {
    const { record, history } = build([['Біг', '1 км (3:45.5)', '2026-02-01']]);

    expect(record.parseTimeFromCount('1 км (3:45.5)')).toBe(225);
    expect(history.entries[0]?.durationMs).toBe(225_500);
  });

  it('counts a faster run as beating the record; Record counted a bigger first number', () => {
    const faster = build([
      ['Біг 5 км', '26:00 (5 км)', '2026-02-01'],
      ['Біг 5 км', '25:00 (5 км)', '2026-02-08'],
      ['Біг 5 км', '24:00 (5 км)', '2026-02-15'],
    ]);
    const slower = build([
      ['Біг 5 км', '24:00 (5 км)', '2026-02-01'],
      ['Біг 5 км', '25:00 (5 км)', '2026-02-08'],
      ['Біг 5 км', '26:00 (5 км)', '2026-02-15'],
    ]);

    // Record reads 26, 25, 24: "no improvement" when getting faster, two when getting slower.
    expect(faster.record.maxImprovements(faster.workouts)).toBe(0);
    expect(slower.record.maxImprovements(slower.workouts)).toBe(2);

    expect(gatherFacts(faster.history, null).maxImprovements).toBe(2);
    expect(gatherFacts(slower.history, null).maxImprovements).toBe(0);
  });

  it('remembers the longest streak of days; Record counted only the latest one', () => {
    const days = ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05', '2026-03-01', '2026-03-02'];
    const { workouts, record, history } = build(days.map((day): Row => ['Підтягування', '10', day]));

    expect(record.calculateStreak(workouts)).toBe(2);
    expect(gatherFacts(history, null).longestStreakDays).toBe(5);
  });

  it('counts own exercises, not their names; Record counted every distance and the bench press', () => {
    const { workouts, record, history } = build([
      ['Марш-кидок 30 км', '4:20:00', '2026-02-01'],
      ['Марш-кидок 10 км', '1:10:00', '2026-02-08'],
      ['Жим лежачи', '1 (+100 кг)', '2026-02-09'],
    ]);

    expect(record.customExCount(workouts)).toBe(3);
    expect(gatherFacts(history, null).customExercises).toBe(1);
  });

  it('measures a goal for a timed exercise in time; Record compared its minutes to the goal', () => {
    const { workouts, record, pedestal } = build([
      ['Смуга перешкод', '5:30', '2026-02-01'],
      ['Смуга перешкод', '4:40', '2026-02-08'],
    ]);
    const theirs = record._pedestalEntryFrom(workouts, 'Смуга перешкод');
    const mine = pedestal.get('custom:смуга-перешкод');
    if (!theirs || !mine) throw new Error('expected a record on both sides');

    // Record: the biggest leading number is 5 (of "5:30"), so a goal of 4 reads as 125%, capped at 100.
    expect(record.goalPercent('Смуга перешкод', theirs, 4)).toBe(100);

    // Here the goal is a time: 4:00 against a best of 4:40 is 86%.
    expect(goalProgress(mine, 240_000)).toBe(86);
  });
});
