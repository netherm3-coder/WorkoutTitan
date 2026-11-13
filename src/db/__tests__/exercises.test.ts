import { customExercise, PULLUPS } from '@/domain';
import { entry } from '@/domain/__tests__/support';

import { addEntries, deleteEntry } from '../entries';
import { deleteExercise, listDeletedExercises, listExercises, restoreExercise, saveExercise } from '../exercises';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

const PLANK = customExercise({ id: 'custom:планка', name: 'Планка', kind: 'duration', better: 'higher' });
const SQUATS = customExercise({ id: 'custom:присідання', name: 'Присідання', kind: 'count', unit: 'кг' });
const MARCH = customExercise({ id: 'custom:марш-кидок', name: 'Марш-кидок', kind: 'distanceTime', distanceUnit: 'km' });
const NOTES = customExercise({ id: 'custom:нотатки', name: 'Нотатки', kind: 'text' });

describe("the person's own exercises", () => {
  it('start with none', async () => {
    expect(await listExercises(db)).toEqual([]);
  });

  it('come back exactly as they were saved, in the order they were added', async () => {
    await saveExercise(db, SQUATS, 1000);
    await saveExercise(db, PLANK, 2000);
    await saveExercise(db, MARCH, 3000);
    await saveExercise(db, NOTES, 4000);

    expect(await listExercises(db)).toEqual([SQUATS, PLANK, MARCH, NOTES]);
  });

  it('are replaced when saved again, and keep their place', async () => {
    await saveExercise(db, SQUATS, 1000);
    await saveExercise(db, PLANK, 2000);

    const renamed = { ...SQUATS, name: 'Присідання зі штангою', unit: 'kg' };
    await saveExercise(db, renamed, 3000);

    expect(await listExercises(db)).toEqual([renamed, PLANK]);
    expect(await db.getFirstAsync('SELECT created_at, updated_at FROM exercises WHERE id = ?', [SQUATS.id])).toEqual({
      created_at: 1000,
      updated_at: 3000,
    });
  });

  it('can be deleted and brought back', async () => {
    await saveExercise(db, SQUATS, 1000);
    await saveExercise(db, PLANK, 2000);

    expect(await deleteExercise(db, SQUATS.id, 3000)).toBe(true);
    expect(await listExercises(db)).toEqual([PLANK]);
    expect(await deleteExercise(db, SQUATS.id, 3500)).toBe(false);

    expect(await restoreExercise(db, SQUATS.id, 4000)).toBe(true);
    expect(await listExercises(db)).toEqual([SQUATS, PLANK]);
    expect(await restoreExercise(db, SQUATS.id, 4500)).toBe(false);
  });

  it('come back when a deleted one is saved again', async () => {
    await saveExercise(db, SQUATS, 1000);
    await deleteExercise(db, SQUATS.id, 2000);

    await saveExercise(db, SQUATS, 3000);

    expect(await listExercises(db)).toEqual([SQUATS]);
  });

  it('do not include the built-in ones, which live in code', async () => {
    await expect(saveExercise(db, PULLUPS, 1000)).rejects.toThrow('built-in');
    await expect(saveExercise(db, { ...PLANK, id: 'run' }, 1000)).rejects.toThrow('built-in');
    expect(await listExercises(db)).toEqual([]);
  });

  it('need a name', async () => {
    await expect(saveExercise(db, { ...PLANK, name: null }, 1000)).rejects.toThrow(/CHECK/);
  });
});

describe('deleted exercises', () => {
  it('are listed apart, the most recently deleted first, with the entries they took with them', async () => {
    await saveExercise(db, PLANK, 1);
    await saveExercise(db, SQUATS, 1);
    await saveExercise(db, MARCH, 1);
    const held = entry(PLANK, '2026-03-01', { durationMs: 60_000 });
    await addEntries(
      db,
      [held, entry(PLANK, '2026-03-02', { durationMs: 90_000 }), entry(PLANK, '2026-03-03', { durationMs: 95_000 }), entry(SQUATS, '2026-03-01', { value: 5 })],
      1,
    );
    // An entry deleted on its own does not count: it is not coming back with the exercise.
    await deleteEntry(db, held.id, 2);

    await deleteExercise(db, PLANK.id, 10);
    await deleteExercise(db, SQUATS.id, 20);

    expect(await listDeletedExercises(db)).toEqual([
      { exercise: SQUATS, entries: 1 },
      { exercise: PLANK, entries: 2 },
    ]);
    expect(await listExercises(db)).toEqual([MARCH]);
  });

  it('leave the list once brought back', async () => {
    await saveExercise(db, PLANK, 1);
    await deleteExercise(db, PLANK.id, 2);

    await restoreExercise(db, PLANK.id, 3);

    expect(await listDeletedExercises(db)).toEqual([]);
    expect(await listExercises(db)).toEqual([PLANK]);
  });
});

