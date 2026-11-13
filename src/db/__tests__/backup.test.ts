import { buildBackup, readBackup, serialiseBackup, type BackupData } from '@/backup/format';
import { convertLegacyWorkouts, customExercise, DEFAULT_LOOK, PULLUPS, RUN } from '@/domain';
import { makeRecordHistory, RECORD_WEIGHTS } from '@/domain/__tests__/recordDataset';
import { entry, minutes, resetSequence } from '@/domain/__tests__/support';

import { collectBackupData, planRestore, restoreBackup } from '../backup';
import { deleteBodyWeight, saveBodyMeasurements, saveBodyWeight } from '../body';
import { addEntries, deleteEntry, listEntries, updateEntry } from '../entries';
import { deleteExercise, saveExercise } from '../exercises';
import { clearGoal, setGoal } from '../goals';
import { saveLook } from '../look';
import { saveProfile } from '../profile';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  resetSequence();
  db = await openTestDatabase();
});

const PLANK = customExercise({ id: 'own:plank', name: 'Планка', kind: 'duration', better: 'higher' });
const SQUAT = customExercise({ id: 'own:squat', name: 'Присідання', kind: 'weight' });

const EMPTY: BackupData = {
  exercises: [],
  entries: [],
  bodyWeights: [],
  bodyMeasurements: [],
  goals: [],
  profile: { heightCm: null, trainingSince: null, soberSince: null },
  look: DEFAULT_LOOK,
};

/** Fills a phone with a bit of everything. */
async function fill(database: TestDatabase) {
  const pullups = entry(PULLUPS, '2026-03-01', { reps: 12, loadKg: 10 }, { note: 'після сну' });
  const run = entry(RUN, '2026-03-03', { distanceM: 3000, durationMs: minutes(12, 40) });
  const plank = entry(PLANK, '2026-03-04', { durationMs: minutes(3) });

  await saveExercise(database, PLANK, 1);
  await addEntries(database, [pullups, run, plank], 1);
  await saveBodyWeight(database, { date: '2026-03-01', kg: 78.4 }, 1);
  await saveBodyMeasurements(database, '2026-03-01', { chest: 104, 'литка ліва': 39.5 }, 1);
  await setGoal(database, 'pullups', 20, 1);
  await saveProfile(database, { heightCm: 181, trainingSince: '2021-09-01' }, 1);
  await saveLook(database, { armour: 'red', hat: 'beanie' }, 1);

  return { pullups, run, plank };
}

/** What a backup made now would hold, with the lists in a set order so two phones compare. */
async function contents(database: TestDatabase) {
  const data = await collectBackupData(database);
  const byText = (a: unknown, b: unknown) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
  return {
    ...data,
    exercises: [...data.exercises].sort(byText),
    entries: [...data.entries].sort(byText),
    bodyMeasurements: [...data.bodyMeasurements].sort(byText),
    goals: [...data.goals].sort(byText),
  };
}

const restore = (database: TestDatabase, data: BackupData, now = 100) =>
  database.withExclusiveTransactionAsync((transaction) => restoreBackup(transaction, data, now));

/** Through the file and back, the way it really travels. */
function throughFile(data: BackupData): BackupData {
  const reading = readBackup(serialiseBackup(buildBackup(data, new Date('2026-11-13T06:30:00Z'), '1.0.0')));
  if (!reading.ok) throw new Error(`the file did not read: ${JSON.stringify(reading)}`);
  return reading.backup;
}

describe('collectBackupData', () => {
  it('is empty for a new phone', async () => {
    expect(await collectBackupData(db)).toEqual(EMPTY);
  });

  it('gathers everything the person entered', async () => {
    const { pullups, run, plank } = await fill(db);

    expect(await collectBackupData(db)).toEqual({
      exercises: [PLANK],
      entries: [pullups, run, plank],
      bodyWeights: [{ date: '2026-03-01', kg: 78.4 }],
      bodyMeasurements: [
        { date: '2026-03-01', part: 'chest', cm: 104 },
        { date: '2026-03-01', part: 'литка ліва', cm: 39.5 },
      ],
      goals: [{ discipline: 'pullups', target: 20 }],
      profile: { heightCm: 181, trainingSince: '2021-09-01', soberSince: null },
      look: { ...DEFAULT_LOOK, armour: 'red', hat: 'beanie' },
    });
  });

  it('leaves out what was deleted, and the entries of a deleted exercise', async () => {
    const { pullups, run } = await fill(db);
    await deleteEntry(db, run.id, 2);
    await deleteExercise(db, PLANK.id, 2);
    await deleteBodyWeight(db, '2026-03-01', 2);
    await saveBodyMeasurements(db, '2026-03-01', { chest: null }, 2);
    await clearGoal(db, 'pullups', 2);

    expect(await collectBackupData(db)).toMatchObject({
      exercises: [],
      entries: [pullups],
      bodyWeights: [],
      bodyMeasurements: [{ date: '2026-03-01', part: 'литка ліва', cm: 39.5 }],
      goals: [],
    });
  });
});

describe('restoreBackup', () => {
  it('makes an empty phone hold what the first one held', async () => {
    await fill(db);
    const other = await openTestDatabase();

    await restore(other, throughFile(await collectBackupData(db)));

    expect(await contents(other)).toEqual(await contents(db));
  });

  it('carries a history brought over from Record without changing a thing', async () => {
    const conversion = convertLegacyWorkouts(makeRecordHistory(2026, 400), {
      newId: () => {
        throw new Error('every workout has an id');
      },
    });
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const exercise of conversion.exercises) await saveExercise(transaction, exercise, 1);
      await addEntries(transaction, conversion.entries.map((item) => item.entry), 1);
      for (const { date, weight } of RECORD_WEIGHTS) await saveBodyWeight(transaction, { date, kg: weight }, 1);
    });
    const other = await openTestDatabase();

    await restore(other, throughFile(await collectBackupData(db)));

    expect((await collectBackupData(other)).entries).toHaveLength(400);
    expect(await contents(other)).toEqual(await contents(db));
  });

  it('can be done twice with the same result', async () => {
    await fill(db);
    const data = throughFile(await collectBackupData(db));
    const other = await openTestDatabase();

    await restore(other, data, 100);
    await restore(other, data, 200);

    expect(await contents(other)).toEqual(await contents(db));
  });

  it('adds to what the phone has and deletes nothing', async () => {
    await fill(db);
    const data = throughFile(await collectBackupData(db));

    const other = await openTestDatabase();
    const mine = entry(PULLUPS, '2026-04-01', { reps: 15 });
    await saveExercise(other, SQUAT, 1);
    await addEntries(other, [mine, entry(SQUAT, '2026-04-02', { reps: 5, loadKg: 100 })], 1);
    await saveBodyWeight(other, { date: '2026-04-01', kg: 80 }, 1);
    await setGoal(other, 'run@3000', 720_000, 1);

    await restore(other, data);

    const after = await collectBackupData(other);
    expect(after.entries).toHaveLength(5);
    expect(after.entries).toContainEqual(mine);
    expect(after.exercises.map((exercise) => exercise.id).sort()).toEqual([PLANK.id, SQUAT.id]);
    expect(after.bodyWeights.map((record) => record.date)).toEqual(['2026-03-01', '2026-04-01']);
    expect(after.goals.map((goal) => goal.discipline).sort()).toEqual(['pullups', 'run@3000']);
  });

  it('puts the version from the file in place of the one on the phone', async () => {
    const { pullups } = await fill(db);
    const data = throughFile(await collectBackupData(db));

    // After the backup was made the phone moved on.
    await updateEntry(db, { ...pullups, reps: 99 }, 2);
    await saveBodyWeight(db, { date: '2026-03-01', kg: 90 }, 2);
    await setGoal(db, 'pullups', 50, 2);
    await saveLook(db, { armour: 'gray' }, 2);

    await restore(db, data);

    const after = await collectBackupData(db);
    expect(after.entries.find((item) => item.id === pullups.id)).toEqual(pullups);
    expect(after.bodyWeights).toEqual([{ date: '2026-03-01', kg: 78.4 }]);
    expect(after.goals).toEqual([{ discipline: 'pullups', target: 20 }]);
    expect(after.look.armour).toBe('red');
  });

  it('brings back what was deleted after the backup was made', async () => {
    const { run } = await fill(db);
    const data = throughFile(await collectBackupData(db));
    await deleteEntry(db, run.id, 2);
    await deleteExercise(db, PLANK.id, 2);
    await deleteBodyWeight(db, '2026-03-01', 2);

    await restore(db, data);

    expect((await listEntries(db)).map((item) => item.id).sort()).toEqual(data.entries.map((item) => item.id).sort());
    expect((await collectBackupData(db)).exercises).toEqual([PLANK]);
    expect((await collectBackupData(db)).bodyWeights).toEqual([{ date: '2026-03-01', kg: 78.4 }]);
  });

  it('does not wipe a profile field the file leaves empty', async () => {
    await saveProfile(db, { heightCm: 181, soberSince: '2025-01-01' }, 1);

    await restore(db, { ...EMPTY, profile: { heightCm: null, trainingSince: '2020-05-05', soberSince: null } });

    expect((await collectBackupData(db)).profile).toEqual({ heightCm: 181, trainingSince: '2020-05-05', soberSince: '2025-01-01' });
  });

  it('leaves the phone as it was when it fails half way', async () => {
    await fill(db);
    const before = await contents(db);
    const broken: BackupData = {
      ...EMPTY,
      entries: [entry(PULLUPS, '2026-05-01', { reps: 30 })],
      bodyWeights: [{ date: '2026-05-01', kg: 70 }],
      goals: [{ discipline: 'pullups', target: -1 }],
    };

    await expect(restore(db, broken)).rejects.toThrow(RangeError);

    expect(await contents(db)).toEqual(before);
  });
});

describe('planRestore', () => {
  it('counts the entries the phone lacks and the ones it would replace', async () => {
    const { pullups, run } = await fill(db);
    const data = await collectBackupData(db);
    const other = await openTestDatabase();

    expect(await planRestore(other, data)).toEqual({ newEntries: 3, replacedEntries: 0 });

    await addEntries(other, [pullups, run], 1);
    expect(await planRestore(other, data)).toEqual({ newEntries: 1, replacedEntries: 2 });

    // A deleted entry counts as lacking: the file brings it back.
    await deleteEntry(other, run.id, 2);
    expect(await planRestore(other, data)).toEqual({ newEntries: 2, replacedEntries: 1 });
  });

  it('changes nothing', async () => {
    await fill(db);
    const other = await openTestDatabase();

    await planRestore(other, await collectBackupData(db));

    expect(await collectBackupData(other)).toEqual(EMPTY);
  });
});
