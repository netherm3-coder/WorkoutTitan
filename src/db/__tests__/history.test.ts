import {
  buildPedestal,
  convertLegacyWorkouts,
  customExercise,
  evaluateAchievements,
  exerciseLookup,
  gatherFacts,
  lifetimeTotals,
  personalBestIds,
  PULLUPS,
  sportStatus,
  type History,
} from '@/domain';
import { makeRecordHistory, RECORD_WEIGHTS } from '@/domain/__tests__/recordDataset';
import { entry, resetSequence } from '@/domain/__tests__/support';

import { saveBodyWeight } from '../body';
import { addEntries, addEntry } from '../entries';
import { deleteExercise, restoreExercise, saveExercise } from '../exercises';
import { loadHistory } from '../history';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  resetSequence();
  db = await openTestDatabase();
});

const PLANK = customExercise({ id: 'custom:планка', name: 'Планка', kind: 'duration', better: 'higher' });

describe('loadHistory', () => {
  it('is empty in a new database, and still knows the built-in exercises', async () => {
    const history = await loadHistory(db);

    expect(history.entries).toEqual([]);
    expect(history.weights).toEqual([]);
    expect(history.exercises('pullups')).toBe(PULLUPS);
    expect(history.exercises('custom:планка')).toBeUndefined();
  });

  it('brings entries, own exercises and weigh-ins together', async () => {
    const pullups = entry(PULLUPS, '2026-02-01', { reps: 12, loadKg: 20 });
    const plank = entry(PLANK, '2026-02-02', { durationMs: 180_000 });
    await saveExercise(db, PLANK, 1);
    await addEntries(db, [plank, pullups], 2);
    await saveBodyWeight(db, { date: '2026-01-01', kg: 80 }, 3);

    const history = await loadHistory(db);

    expect(history.entries).toEqual([pullups, plank]);
    expect(history.exercises(PLANK.id)).toEqual(PLANK);
    expect(history.weights).toEqual([{ date: '2026-01-01', kg: 80 }]);
    expect(buildPedestal(history).get('pullups')).toMatchObject({ entry: pullups, oneRepMaxKg: 53.3 });
  });

  it('leaves out the entries of a deleted exercise until it is brought back', async () => {
    await saveExercise(db, PLANK, 1);
    await addEntries(db, [entry(PULLUPS, '2026-02-01', { reps: 12 }), entry(PLANK, '2026-02-02', { durationMs: 180_000 })], 2);

    await deleteExercise(db, PLANK.id, 3);
    expect((await loadHistory(db)).entries.map((item) => item.exerciseId)).toEqual(['pullups']);

    await restoreExercise(db, PLANK.id, 4);
    expect((await loadHistory(db)).entries.map((item) => item.exerciseId)).toEqual(['pullups', PLANK.id]);
  });

  it('leaves out an entry whose exercise it has never heard of', async () => {
    await addEntry(db, entry('custom:from-another-phone', '2026-02-01', { value: 5 }), 1);
    expect((await loadHistory(db)).entries).toEqual([]);
  });
});

describe('a history carried over from Record', () => {
  it('comes out of the database exactly as it went in', async () => {
    const conversion = convertLegacyWorkouts(makeRecordHistory(2026, 400), {
      newId: () => {
        throw new Error('every workout has an id');
      },
    });
    const weights = RECORD_WEIGHTS.map(({ date, weight }) => ({ date, kg: weight }));
    const before: History = {
      entries: conversion.entries.map((item) => item.entry),
      exercises: exerciseLookup(conversion.exercises),
      weights,
    };

    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const exercise of conversion.exercises) await saveExercise(transaction, exercise, 1);
      await addEntries(transaction, before.entries, 1);
      for (const weight of weights) await saveBodyWeight(transaction, weight, 1);
    });
    const after = await loadHistory(db);

    expect(after.entries).toHaveLength(400);
    expect(new Map(after.entries.map((item) => [item.id, item]))).toEqual(new Map(before.entries.map((item) => [item.id, item])));
    for (const exercise of conversion.exercises) {
      expect(after.exercises(exercise.id)).toEqual(exercise);
    }

    // And so everything worked out from it is the same.
    expect(buildPedestal(after)).toEqual(buildPedestal(before));
    expect(personalBestIds(after)).toEqual(personalBestIds(before));
    expect(lifetimeTotals(after)).toEqual(lifetimeTotals(before));
    expect(gatherFacts(after, 100)).toEqual(gatherFacts(before, 100));
    expect(sportStatus(after, '2026-11-12')).toEqual(sportStatus(before, '2026-11-12'));
    expect(evaluateAchievements(after, { soberDays: 100 })).toEqual(evaluateAchievements(before, { soberDays: 100 }));
  });
});
