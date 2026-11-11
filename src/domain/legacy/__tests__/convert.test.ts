import { entryProblems, NO_MEASURES } from '../../entry';
import { exerciseLookup } from '../../exercises';
import { convertLegacyWorkouts, type LegacyWorkout } from '../convert';

const DATE = '2026-03-14';

function convert(workouts: readonly Partial<LegacyWorkout>[]) {
  let made = 0;
  return convertLegacyWorkouts(
    workouts.map((workout) => ({ exercise: 'Підтягування', count: '1', date: DATE, ...workout })),
    { newId: () => `new-${(made += 1)}` },
  );
}

/** Converts one result and hands back its numbers, exercise and issues. */
function read(exercise: string, count: string) {
  const { entries, exercises } = convert([{ exercise, count }]);
  const [converted] = entries;
  if (!converted) throw new Error('nothing was converted');

  const { id, exerciseId, date, createdAt, note, videoUrl, resultUrl, ...measures } = converted.entry;
  return { exerciseId, measures, issues: converted.issues, exercise: exercises[0] ?? null };
}

const numbers = (measures: Partial<typeof NO_MEASURES>) => ({ ...NO_MEASURES, ...measures });

describe('pull-ups, push-ups and dips', () => {
  it.each([
    ['12', { reps: 12 }],
    ['12 (+20 кг)', { reps: 12, loadKg: 20 }],
    ['12 (0:41)', { reps: 12, durationMs: 41_000 }],
    ['12 (+20 кг) (0:41)', { reps: 12, loadKg: 20, durationMs: 41_000 }],
    ['12,5 (+7,5 кг)', { reps: 12.5, loadKg: 7.5 }],
    ['1 (+60кг)', { reps: 1, loadKg: 60 }],
  ])('read "%s"', (count, expected) => {
    expect(read('Підтягування', count)).toEqual({
      exerciseId: 'pullups',
      measures: numbers(expected),
      issues: [],
      exercise: null,
    });
  });

  it('go to the built-in exercises', () => {
    expect(read('Відтискання', '40').exerciseId).toBe('pushups');
    expect(read('Бруси', '15 (+10 кг)').exerciseId).toBe('dips');
  });

  it('keep a result without a number as text and flag it', () => {
    expect(read('Підтягування', 'багато')).toMatchObject({
      measures: numbers({ text: 'багато' }),
      issues: ['keptAsText'],
    });
  });

  it.each(['12+10+8', '12 (вузький хват)', '12 (+20 кг) легко'])(
    'keep the wording of "%s" next to the number read from it',
    (count) => {
      expect(read('Підтягування', count)).toMatchObject({
        measures: { reps: 12, text: count },
        issues: ['looselyRead'],
      });
    },
  );
});

describe('runs', () => {
  it('take the distance from the exercise name and the time from the result', () => {
    expect(read('Біг 5 км', '24:30 (5 км)')).toEqual({
      exerciseId: 'run',
      measures: numbers({ distanceM: 5000, durationMs: 1_470_000 }),
      issues: [],
      exercise: null,
    });
  });

  it.each([
    ['Біг 21.1 км', '1:45:30 (21.1 км)', 21_100, 6_330_000],
    ['Біг 1 км', '3:45.5 (1 км)', 1000, 225_500],
    ['Біг 0.4 км', '1:12 (0.4 км)', 400, 72_000],
    ['Біг 2,5 км', '11:40 (2,5 км)', 2500, 700_000],
  ])('read %s in %s', (exercise, count, distanceM, durationMs) => {
    expect(read(exercise, count)).toMatchObject({ measures: { distanceM, durationMs }, issues: [] });
  });

  it('read the old format, where the distance was part of the result', () => {
    expect(read('Біг', '5 км (25:00)')).toMatchObject({
      exerciseId: 'run',
      measures: { distanceM: 5000, durationMs: 1_500_000, text: null },
      issues: [],
    });
  });

  it('flag a run without a distance', () => {
    expect(read('Біг', '25:00')).toMatchObject({
      measures: { distanceM: null, durationMs: 1_500_000 },
      issues: ['distanceMissing'],
    });
  });

  it('trust the exercise name when the result names another distance, and keep the wording', () => {
    expect(read('Біг 5 км', '24:30 (3 км)')).toMatchObject({
      measures: { distanceM: 5000, durationMs: 1_470_000, text: '24:30 (3 км)' },
      issues: ['looselyRead'],
    });
  });

  it('keep a remark that the numbers do not hold', () => {
    expect(read('Біг 5 км', '24:30 (5 км) у дощ')).toMatchObject({
      measures: { distanceM: 5000, durationMs: 1_470_000, text: '24:30 (5 км) у дощ' },
      issues: ['looselyRead'],
    });
  });

  it('keep a result without a time as text', () => {
    expect(read('Біг 5 км', 'не добіг')).toMatchObject({
      exerciseId: 'run',
      measures: numbers({ text: 'не добіг' }),
      issues: ['keptAsText'],
    });
  });
});

describe('sprints', () => {
  it.each([
    ['Спринт 100 м', '12.5 с (100 м)', 100, 12_500],
    ['Спринт 60 м', '8,1 с (60 м)', 60, 8100],
    ['Спринт 400 м', '65 с (400 м)', 400, 65_000],
    ['Спринт', '100 м (12.5 с)', 100, 12_500],
  ])('read %s: %s', (exercise, count, distanceM, durationMs) => {
    expect(read(exercise, count)).toEqual({
      exerciseId: 'sprint',
      measures: numbers({ distanceM, durationMs }),
      issues: [],
      exercise: null,
    });
  });
});

describe('shuttle runs', () => {
  it.each([
    ['Човниковий біг 4×9м', '0:09.80 (4×9м)', 4, 9, 9800],
    ['Човниковий біг 10×10м', '0:24.50 (10×10м)', 10, 10, 24_500],
    ['Човниковий біг 6×100м', '1:58.07 (6×100м)', 6, 100, 118_070],
    ['Човниковий біг', '10х10 м (24.5 с)', 10, 10, 24_500],
    ['Човниковий біг', '24.5 с (10х10 м)', 10, 10, 24_500],
    ['Човниковий біг 10х10', '10х10 м (24.5 с)', 10, 10, 24_500],
  ])('read %s: %s', (exercise, count, segments, distanceM, durationMs) => {
    expect(read(exercise, count)).toEqual({
      exerciseId: 'shuttle',
      measures: numbers({ segments, distanceM, durationMs }),
      issues: [],
      exercise: null,
    });
  });

  it('assume 10 x 10 m for old entries without a scheme, as Record labelled them', () => {
    expect(read('Човниковий біг', '24.5 с')).toMatchObject({
      measures: { segments: 10, distanceM: 10, durationMs: 24_500 },
      issues: ['schemeAssumed'],
    });
  });
});

describe('the bench press', () => {
  it.each([
    ['1 (+100 кг)', { reps: 1, loadKg: 100 }],
    ['5 (+82,5 кг)', { reps: 5, loadKg: 82.5 }],
  ])('reads "%s" as reps with a weight', (count, expected) => {
    expect(read('Жим лежачи', count)).toEqual({
      exerciseId: 'benchPress',
      measures: numbers(expected),
      issues: [],
      exercise: null,
    });
  });

  it.each(['100 кг', '100', '100kg'])('takes a bare "%s" as one rep and says so', (count) => {
    expect(read('Жим лежачи', count)).toMatchObject({
      exerciseId: 'benchPress',
      measures: { reps: 1, loadKg: 100 },
      issues: ['singleRepAssumed'],
    });
  });

  it('is recognised whatever the capitals', () => {
    expect(read('жим лежачи', '1 (+100 кг)').exerciseId).toBe('benchPress');
  });

  it.each(['не пішло', '100 кг (5)', '5х100', '100 кг на 5'])('keeps "%s" as text instead of guessing', (count) => {
    expect(read('Жим лежачи', count)).toMatchObject({
      exerciseId: 'benchPress',
      measures: numbers({ text: count }),
      issues: ['keptAsText'],
    });
  });

  it('is not confused with its variations', () => {
    const { exerciseId, exercise } = read('Жим лежачи вузьким хватом', '5 (+70 кг)');
    expect(exerciseId).toBe('custom:жим-лежачи-вузьким-хватом');
    expect(exercise).toMatchObject({ name: 'Жим лежачи вузьким хватом', kind: 'bodyweight', builtIn: false });
  });
});

describe('custom exercises', () => {
  it('become a count for a number with a unit', () => {
    expect(read('Присідання зі штангою', '100 кг')).toEqual({
      exerciseId: 'custom:присідання-зі-штангою',
      measures: numbers({ value: 100 }),
      issues: [],
      exercise: {
        id: 'custom:присідання-зі-штангою',
        name: 'Присідання зі штангою',
        kind: 'count',
        better: 'higher',
        builtIn: false,
        unit: 'кг',
        distanceUnit: null,
      },
    });
  });

  it('become a count without a unit for a bare number', () => {
    expect(read('Присідання', '50')).toMatchObject({
      measures: numbers({ value: 50 }),
      exercise: { kind: 'count', unit: null },
    });
  });

  it.each([
    ['2:30', 150_000],
    ['1:05:00', 3_900_000],
  ])('become a race against the clock for a bare time like %s', (count, durationMs) => {
    expect(read('Смуга перешкод', count)).toMatchObject({
      measures: numbers({ durationMs }),
      issues: [],
      exercise: { kind: 'duration', better: 'lower' },
    });
  });

  it('become a distance against the clock when the name ends in one', () => {
    expect(read('Марш-кидок 30 км', '4:20:00')).toEqual({
      exerciseId: 'custom:марш-кидок',
      measures: numbers({ distanceM: 30_000, durationMs: 15_600_000 }),
      issues: [],
      exercise: {
        id: 'custom:марш-кидок',
        name: 'Марш-кидок',
        kind: 'distanceTime',
        better: 'lower',
        builtIn: false,
        unit: null,
        distanceUnit: 'km',
      },
    });
    expect(read('Плавання 400 м', '8:05')).toMatchObject({
      measures: { distanceM: 400, durationMs: 485_000 },
      exercise: { name: 'Плавання', distanceUnit: 'm' },
    });
  });

  it('keep the distances of one exercise together', () => {
    const { entries, exercises } = convert([
      { exercise: 'Марш-кидок 30 км', count: '4:20:00' },
      { exercise: 'Марш-кидок 10 км', count: '1:10:00' },
    ]);

    expect(exercises).toHaveLength(1);
    expect(entries.map((item) => [item.entry.exerciseId, item.entry.distanceM])).toEqual([
      ['custom:марш-кидок', 30_000],
      ['custom:марш-кидок', 10_000],
    ]);
  });

  it('read a number with a time and rank by the number', () => {
    expect(read('Берпі', '50 (3:41.2)')).toMatchObject({
      measures: numbers({ value: 50, durationMs: 221_200 }),
      issues: [],
      exercise: { kind: 'count' },
    });
  });

  it('become reps with an optional load when some sets carry one', () => {
    const { entries, exercises } = convert([
      { exercise: 'Вихід силою', count: '5 (+10 кг)' },
      { exercise: 'Вихід силою', count: '8' },
      { exercise: 'Вихід силою', count: '7 (0:30)' },
    ]);

    expect(exercises).toMatchObject([{ name: 'Вихід силою', kind: 'bodyweight' }]);
    expect(entries.map((item) => [item.entry.reps, item.entry.loadKg, item.entry.durationMs, item.issues])).toEqual([
      [5, 10, null, []],
      [8, null, null, []],
      [7, null, 30_000, []],
    ]);
  });

  it('stay an exercise of words when the results are words, and flag nothing', () => {
    expect(read('Розтяжка', 'шпагат майже, але важко')).toEqual({
      exerciseId: 'custom:розтяжка',
      measures: numbers({ text: 'шпагат майже, але важко' }),
      issues: [],
      exercise: expect.objectContaining({ kind: 'text', better: null }),
    });
  });

  it('take the kind most of their results have and flag the ones that do not fit', () => {
    const { entries, exercises } = convert([
      { exercise: 'Планка', count: '2:00' },
      { exercise: 'Планка', count: 'довго' },
      { exercise: 'Планка', count: '2:30' },
      { exercise: 'Планка', count: '3:00' },
    ]);

    expect(exercises).toMatchObject([{ kind: 'duration' }]);
    expect(entries.map((item) => [item.entry.durationMs, item.entry.text, item.issues])).toEqual([
      [120_000, null, []],
      [null, 'довго', ['keptAsText']],
      [150_000, null, []],
      [180_000, null, []],
    ]);
  });

  it('show everything as written when most results are words', () => {
    const { entries, exercises } = convert([
      { exercise: 'Йога', count: 'ранкова' },
      { exercise: 'Йога', count: '45 хв' },
      { exercise: 'Йога', count: 'вечірня' },
    ]);

    expect(exercises).toMatchObject([{ kind: 'text' }]);
    expect(entries.map((item) => [item.entry.text, item.entry.value, item.issues])).toEqual([
      ['ранкова', null, []],
      ['45 хв', null, []],
      ['вечірня', null, []],
    ]);
  });

  it('do not compare numbers in different units', () => {
    const { entries, exercises } = convert([
      { exercise: 'Жим ногами', count: '100 кг' },
      { exercise: 'Жим ногами', count: '120 КГ.' },
      { exercise: 'Жим ногами', count: '5 разів' },
      { exercise: 'Жим ногами', count: '130' },
    ]);

    expect(exercises).toMatchObject([{ kind: 'count', unit: 'кг' }]);
    expect(entries.map((item) => [item.entry.value, item.entry.text, item.issues])).toEqual([
      [100, null, []],
      [120, null, []],
      [null, '5 разів', ['keptAsText']],
      [130, null, []],
    ]);
  });

  it('prefer the more telling kind when two are equally common', () => {
    const { entries, exercises } = convert([
      { exercise: 'Смуга перешкод', count: '5 кіл' },
      { exercise: 'Смуга перешкод', count: '2:30' },
    ]);

    expect(exercises).toMatchObject([{ kind: 'duration' }]);
    expect(entries.map((item) => [item.entry.durationMs, item.entry.text, item.issues])).toEqual([
      [null, '5 кіл', ['keptAsText']],
      [150_000, null, []],
    ]);
  });

  it('take the unit met first when two are equally common', () => {
    const { entries, exercises } = convert([
      { exercise: 'Жим ногами', count: '100 кг' },
      { exercise: 'Жим ногами', count: '5 разів' },
    ]);

    expect(exercises).toMatchObject([{ kind: 'count', unit: 'кг' }]);
    expect(entries.map((item) => item.issues)).toEqual([[], ['keptAsText']]);
  });

  it('keep a time without a distance among results over a distance, and flag it', () => {
    const { entries, exercises } = convert([
      { exercise: 'Велосипед 20 км', count: '45:00' },
      { exercise: 'Велосипед 20 км', count: '44:10' },
      { exercise: 'Велосипед', count: '1:30:00' },
    ]);

    expect(exercises).toMatchObject([{ name: 'Велосипед', kind: 'distanceTime' }]);
    expect(entries.map((item) => [item.entry.distanceM, item.entry.durationMs, item.issues])).toEqual([
      [20_000, 2_700_000, []],
      [20_000, 2_650_000, []],
      [null, 5_400_000, ['distanceMissing']],
    ]);
  });

  it('are one exercise however the name was capitalised or spaced', () => {
    const { entries, exercises } = convert([
      { exercise: 'Планка', count: '2:00' },
      { exercise: 'планка', count: '2:10' },
      { exercise: ' Планка ', count: '2:20' },
    ]);

    expect(exercises).toMatchObject([{ id: 'custom:планка', name: 'Планка' }]);
    expect(new Set(entries.map((item) => item.entry.exerciseId)).size).toBe(1);
  });

  it('time a hand-typed running name as Record did, keeping the wording', () => {
    expect(read('Біг по сходах', '1:20 (10 поверхів)')).toMatchObject({
      exerciseId: 'custom:біг-по-сходах',
      measures: { durationMs: 80_000, text: '1:20 (10 поверхів)' },
      issues: ['looselyRead'],
      exercise: { kind: 'duration', better: 'lower' },
    });
    expect(read('Біг на місці', '100 разів')).toMatchObject({
      measures: numbers({ value: 100 }),
      exercise: { kind: 'count', unit: 'разів' },
    });
  });
});

describe('what an entry keeps besides its result', () => {
  it('keeps its id, moment of writing, note and links', () => {
    const { entries } = convert([
      {
        id: 'abc123',
        createdAt: 1_770_000_000_000,
        note: 'після нічної',
        videoUrl: 'https://example.com/v',
        resultUrl: 'https://example.com/r',
      },
    ]);

    expect(entries[0]?.entry).toMatchObject({
      id: 'abc123',
      date: DATE,
      createdAt: 1_770_000_000_000,
      note: 'після нічної',
      videoUrl: 'https://example.com/v',
      resultUrl: 'https://example.com/r',
    });
  });

  it('makes up what old documents lack', () => {
    const { entries } = convert([{ id: null, createdAt: null, note: null }, { id: '' }]);
    const [first, second] = entries.map((item) => item.entry);

    expect([first?.id, second?.id]).toEqual(['new-1', 'new-2']);
    expect(first).toMatchObject({ note: '', videoUrl: '', resultUrl: '' });

    // Midday of the workout's own day, so an old entry never counts as written at night.
    const written = new Date(first?.createdAt ?? NaN);
    expect([written.getFullYear(), written.getMonth(), written.getDate(), written.getHours()]).toEqual([2026, 2, 14, 12]);
  });

  it('keeps the original strings for tracing a wrong reading', () => {
    const { entries } = convert([{ exercise: ' Біг ', count: ' 5 км (25:00) ' }]);
    expect(entries[0]?.source).toEqual({ exercise: ' Біг ', count: ' 5 км (25:00) ' });
  });
});

describe('documents that cannot become entries', () => {
  it.each(['14.03.2026', '2026-02-30', ''])('are set aside for a date like "%s"', (date) => {
    const { entries, skipped } = convert([{ date }]);
    expect(entries).toEqual([]);
    expect(skipped).toMatchObject([{ reason: 'badDate' }]);
  });

  it('are set aside without a result or an exercise', () => {
    const { entries, skipped } = convert([{ count: '   ' }, { exercise: '' }, { count: '12' }]);

    expect(entries).toHaveLength(1);
    expect(skipped.map((item) => item.reason)).toEqual(['emptyResult', 'emptyResult']);
  });

  it('survive fields of the wrong type', () => {
    const broken = { exercise: 'Підтягування', count: 12, date: DATE, note: 5 } as unknown as LegacyWorkout;
    const { entries } = convertLegacyWorkouts([broken], { newId: () => 'x' });

    expect(entries[0]?.entry).toMatchObject({ reps: 12, note: '5' });
  });
});

describe('a whole export', () => {
  const workouts: LegacyWorkout[] = [
    { id: 'a', exercise: 'Підтягування', count: '12 (+20 кг)', date: '2026-01-05' },
    { id: 'b', exercise: 'Біг 5 км', count: '24:30 (5 км)', date: '2026-01-06' },
    { id: 'c', exercise: 'Спринт 100 м', count: '12.5 с (100 м)', date: '2026-01-07' },
    { id: 'd', exercise: 'Човниковий біг 4×9м', count: '0:09.80 (4×9м)', date: '2026-01-08' },
    { id: 'e', exercise: 'Жим лежачи', count: '3 (+90 кг)', date: '2026-01-09' },
    { id: 'f', exercise: 'Планка', count: '3:00', date: '2026-01-10' },
    { id: 'g', exercise: 'Марш-кидок 30 км', count: '4:20:00', date: '2026-01-11' },
    { id: 'h', exercise: 'Присідання', count: '100 кг', date: '2026-01-12' },
    { id: 'i', exercise: 'Розтяжка', count: 'шпагат', date: '2026-01-13' },
  ];

  it('converts the same way every time', () => {
    const run = () => convertLegacyWorkouts(workouts, { newId: () => 'unused' });
    expect(run()).toEqual(run());
  });

  it('gives entries the form would accept as they are', () => {
    const { entries, exercises, skipped } = convertLegacyWorkouts(workouts, { newId: () => 'unused' });
    const lookup = exerciseLookup(exercises);

    expect(skipped).toEqual([]);
    expect(entries.map((item) => item.entry.id)).toEqual(workouts.map((workout) => workout.id));
    for (const { entry, issues } of entries) {
      const exercise = lookup(entry.exerciseId);
      if (!exercise) throw new Error(`no exercise for ${entry.id}`);

      expect({ id: entry.id, issues, problems: entryProblems(entry, exercise) }).toEqual({
        id: entry.id,
        issues: [],
        problems: [],
      });
    }
  });

  it('lists only the exercises that are not built in', () => {
    const { exercises } = convertLegacyWorkouts(workouts, { newId: () => 'unused' });
    expect(exercises.map((exercise) => [exercise.name, exercise.kind])).toEqual([
      ['Планка', 'duration'],
      ['Марш-кидок', 'distanceTime'],
      ['Присідання', 'count'],
      ['Розтяжка', 'text'],
    ]);
  });
});
