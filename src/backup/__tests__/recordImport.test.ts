import { convertLegacyWorkouts, customExercise, type Conversion, type LegacyWorkout } from '@/domain';

import { fitRecordImport } from '../recordImport';

let nextId = 0;
const row = (exercise: string, count: string, date = '2026-03-01'): LegacyWorkout => ({ id: `r${(nextId += 1)}`, date, exercise, count });

const convert = (workouts: LegacyWorkout[]): Conversion =>
  convertLegacyWorkouts(workouts, {
    newId: () => {
      throw new Error('every row has an id');
    },
  });

const fromRecord = (name: string) => `${name} (Record)`;
const fit = (conversion: Conversion, own = [] as ReturnType<typeof customExercise>[], known: string[] = []) =>
  fitRecordImport(conversion, own, new Set(known), fromRecord);

beforeEach(() => {
  nextId = 0;
});

describe('fitRecordImport', () => {
  it('brings everything to an empty phone', () => {
    const conversion = convert([row('Підтягування', '12'), row('Планка', '3:00'), row('Планка', '3:30')]);

    const plan = fit(conversion);

    expect(plan.entries).toEqual(conversion.entries.map((item) => item.entry));
    expect(plan.exercises).toEqual(conversion.exercises);
    expect(plan.exercises.map((exercise) => [exercise.name, exercise.kind])).toEqual([['Планка', 'duration']]);
    expect(plan.alreadyHere).toBe(0);
  });

  it('adds only the rows the phone has never had, deleted ones included', () => {
    const conversion = convert([row('Підтягування', '12'), row('Підтягування', '13'), row('Підтягування', '14')]);

    const plan = fit(conversion, [], ['r1', 'r3']);

    expect(plan.entries.map((entry) => entry.id)).toEqual(['r2']);
    expect(plan.alreadyHere).toBe(2);
  });

  it('adds nothing the second time', () => {
    const conversion = convert([row('Підтягування', '12'), row('Планка', '3:00')]);
    const first = fit(conversion);

    const second = fit(conversion, first.exercises, first.entries.map((entry) => entry.id));

    expect(second).toMatchObject({ entries: [], exercises: [], alreadyHere: 2 });
  });

  it('does not make an exercise again when the phone has it under the same id', () => {
    const conversion = convert([row('Планка', '3:00')]);
    const existing = conversion.exercises;

    expect(fit(conversion, existing).exercises).toEqual([]);
    expect(fit(conversion, existing).entries).toHaveLength(1);
  });

  it('joins old results to an exercise the person already made by hand, whatever the case of the name', () => {
    const own = customExercise({ id: 'own:1', name: 'планка ', kind: 'duration', better: 'higher' });
    const conversion = convert([row('Планка', '3:00'), row('Планка', '3:30')]);

    const plan = fit(conversion, [own]);

    expect(plan.exercises).toEqual([]);
    expect(plan.entries.map((entry) => entry.exerciseId)).toEqual(['own:1', 'own:1']);
  });

  it('keeps apart an exercise of the same name that measures something else', () => {
    const own = customExercise({ id: 'own:1', name: 'Планка', kind: 'count' });
    const conversion = convert([row('Планка', '3:00')]);

    const plan = fit(conversion, [own]);

    expect(plan.exercises.map((exercise) => [exercise.id, exercise.name, exercise.kind])).toEqual([
      [conversion.exercises[0]?.id, 'Планка (Record)', 'duration'],
    ]);
    expect(plan.entries.map((entry) => entry.exerciseId)).toEqual([conversion.exercises[0]?.id]);
  });

  it('does not make an exercise that has no new rows', () => {
    const conversion = convert([row('Планка', '3:00'), row('Підтягування', '12')]);

    const plan = fit(conversion, [], ['r1']);

    expect(plan.exercises).toEqual([]);
    expect(plan.entries.map((entry) => entry.id)).toEqual(['r2']);
  });

  it('counts what was read with a reservation, among the new rows only', () => {
    const conversion = convert([
      row('Підтягування', 'багато'),
      row('Підтягування', '12+10+8'),
      row('Біг', '25:00'),
      row('Човниковий біг', '24.5 с'),
      row('Жим лежачи', '100 кг'),
      row('Підтягування', 'ще більше'),
    ]);

    expect(fit(conversion).issues).toEqual({
      keptAsText: 2,
      looselyRead: 1,
      distanceMissing: 1,
      schemeAssumed: 1,
      singleRepAssumed: 1,
    });
    expect(fit(conversion, [], ['r1']).issues.keptAsText).toBe(1);
  });

  it('lists the wording of what stayed text, so the person can see what was not understood', () => {
    const conversion = convert([row('Підтягування', 'багато'), row('Підтягування', '12'), row('Бруси', 'до відмови')]);

    expect(fit(conversion).keptAsText).toEqual([
      { exercise: 'Підтягування', count: 'багато' },
      { exercise: 'Бруси', count: 'до відмови' },
    ]);
  });
});
