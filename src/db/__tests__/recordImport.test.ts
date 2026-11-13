import { readRecordCsv, writeRecordCsv } from '@/backup/recordCsv';
import {
  buildPedestal,
  convertLegacyWorkouts,
  customExercise,
  lifetimeTotals,
  PULLUPS,
  type Conversion,
  type LegacyWorkout,
} from '@/domain';
import { makeRecordHistory } from '@/domain/__tests__/recordDataset';
import { entry, resetSequence } from '@/domain/__tests__/support';

import { addEntries, deleteEntry, listEntries, updateEntry } from '../entries';
import { listExercises, saveExercise } from '../exercises';
import { loadHistory } from '../history';
import { importRecord, planRecordImport } from '../recordImport';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  resetSequence();
  db = await openTestDatabase();
});

const fromRecord = (name: string) => `${name} (Record)`;

const convert = (workouts: readonly LegacyWorkout[]): Conversion =>
  convertLegacyWorkouts(workouts, {
    newId: () => {
      throw new Error('every row has an id');
    },
  });

/** From the text of Record's file to what the converter makes of it. */
function fromFile(text: string): Conversion {
  const reading = readRecordCsv(text);
  if (!reading.ok) throw new Error('not read as a Record file');
  return convert(reading.workouts);
}

async function bringIn(database: TestDatabase, conversion: Conversion, now = 100) {
  const plan = await planRecordImport(database, conversion, fromRecord);
  await database.withExclusiveTransactionAsync((transaction) => importRecord(transaction, plan, now));
  return plan;
}

const FILE = writeRecordCsv([
  { date: '2026-03-03', exercise: 'Планка', count: '3:30' },
  { date: '2026-03-02', exercise: 'Підтягування', count: '12 (+20 кг)' },
  { date: '2026-03-01', exercise: 'Планка', count: '3:00' },
]);

describe("bringing Record's file in", () => {
  it('changes nothing while it is only being planned', async () => {
    await planRecordImport(db, fromFile(FILE), fromRecord);

    expect(await listEntries(db)).toEqual([]);
    expect(await listExercises(db)).toEqual([]);
  });

  it('adds the entries and the exercises they need', async () => {
    const plan = await bringIn(db, fromFile(FILE));

    expect(plan).toMatchObject({ alreadyHere: 0 });
    expect((await listExercises(db)).map((exercise) => [exercise.name, exercise.kind])).toEqual([['Планка', 'duration']]);
    expect((await loadHistory(db)).entries.map((item) => [item.date, item.exerciseId, item.reps, item.loadKg, item.durationMs])).toEqual([
      ['2026-03-01', 'custom:планка', null, null, 180_000],
      ['2026-03-02', 'pullups', 12, 20, null],
      ['2026-03-03', 'custom:планка', null, null, 210_000],
    ]);
  });

  it('adds nothing when the same file is brought in again', async () => {
    await bringIn(db, fromFile(FILE));
    const before = await listEntries(db);

    const again = await bringIn(db, fromFile(FILE), 200);

    expect(again).toMatchObject({ entries: [], exercises: [], alreadyHere: 3 });
    expect(await listEntries(db)).toEqual(before);
  });

  it('adds only the new rows when Record has been used some more', async () => {
    await bringIn(db, fromFile(FILE));
    const later = writeRecordCsv([{ date: '2026-03-05', exercise: 'Підтягування', count: '14' }]) + FILE.split('\n').slice(1).join('\n');

    const plan = await bringIn(db, fromFile(later), 200);

    expect(plan).toMatchObject({ alreadyHere: 3 });
    expect(plan.entries.map((item) => item.date)).toEqual(['2026-03-05']);
    expect(await listEntries(db)).toHaveLength(4);
  });

  it('leaves alone what the person corrected or deleted after the first time', async () => {
    await bringIn(db, fromFile(FILE));
    const [first, second] = await listEntries(db);
    if (!first || !second) throw new Error('expected entries');
    await updateEntry(db, { ...first, note: 'виправлено' }, 2);
    await deleteEntry(db, second.id, 2);

    await bringIn(db, fromFile(FILE), 200);

    const after = await listEntries(db);
    expect(after).toHaveLength(2);
    expect(after.find((item) => item.id === first.id)?.note).toBe('виправлено');
    expect(after.find((item) => item.id === second.id)).toBeUndefined();
  });

  it('does not touch entries made in the app itself', async () => {
    const mine = entry(PULLUPS, '2026-04-01', { reps: 15 });
    await addEntries(db, [mine], 1);

    await bringIn(db, fromFile(FILE));

    expect(await listEntries(db)).toHaveLength(4);
    expect(await listEntries(db)).toContainEqual(mine);
  });

  it('joins old results to an exercise made by hand under the same name', async () => {
    await saveExercise(db, customExercise({ id: 'own:1', name: 'Планка', kind: 'duration', better: 'higher' }), 1);

    await bringIn(db, fromFile(FILE));

    expect((await listExercises(db)).map((exercise) => exercise.id)).toEqual(['own:1']);
    expect((await loadHistory(db)).entries.filter((item) => item.exerciseId === 'own:1')).toHaveLength(2);
  });

  it('adds all of it or none of it', async () => {
    const plan = await planRecordImport(db, fromFile(FILE), fromRecord);
    const broken = { ...plan, entries: [...plan.entries, { ...plan.entries[0], id: plan.entries[1]?.id }] } as typeof plan;

    await expect(db.withExclusiveTransactionAsync((transaction) => importRecord(transaction, broken, 1))).rejects.toThrow();

    expect(await listEntries(db)).toEqual([]);
    expect(await listExercises(db)).toEqual([]);
  });

  it('gives the same records and totals through the file as straight from Record', async () => {
    const original = makeRecordHistory(2026, 400);
    const direct = await openTestDatabase();
    await bringIn(direct, convert(original));

    // The file drops the ids, the notes and the time of day. None of them may change a number.
    await bringIn(db, fromFile(writeRecordCsv(original)));

    const viaFile = await loadHistory(db);
    const straight = await loadHistory(direct);
    const records = (history: typeof viaFile) =>
      [...buildPedestal(history)].map(([discipline, record]) => [discipline, record.entry.date, record.score, record.peak]).sort();

    expect(viaFile.entries).toHaveLength(400);
    expect(lifetimeTotals(viaFile)).toEqual(lifetimeTotals(straight));
    expect(records(viaFile)).toEqual(records(straight));
  });
});
