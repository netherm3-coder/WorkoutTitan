import { bodyWeightAt } from '@/domain';

import { deleteBodyWeight, listBodyMeasurements, listBodyWeights, saveBodyMeasurements, saveBodyWeight } from '../body';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

describe('body weight', () => {
  it('starts with nothing weighed', async () => {
    expect(await listBodyWeights(db)).toEqual([]);
  });

  it('is listed oldest first, whatever order it was entered in', async () => {
    await saveBodyWeight(db, { date: '2026-03-01', kg: 80 }, 1);
    await saveBodyWeight(db, { date: '2026-01-10', kg: 78.4 }, 2);
    await saveBodyWeight(db, { date: '2026-06-20', kg: 82.5 }, 3);

    const weights = await listBodyWeights(db);
    expect(weights).toEqual([
      { date: '2026-01-10', kg: 78.4 },
      { date: '2026-03-01', kg: 80 },
      { date: '2026-06-20', kg: 82.5 },
    ]);
    expect(bodyWeightAt('2026-04-01', weights)).toBe(80);
  });

  it('has one value a day: weighing again replaces it', async () => {
    await saveBodyWeight(db, { date: '2026-03-01', kg: 80 }, 1);
    await saveBodyWeight(db, { date: '2026-03-01', kg: 79.6 }, 2);

    expect(await listBodyWeights(db)).toEqual([{ date: '2026-03-01', kg: 79.6 }]);
  });

  it('can be deleted, and entered again afterwards', async () => {
    await saveBodyWeight(db, { date: '2026-03-01', kg: 80 }, 1);

    expect(await deleteBodyWeight(db, '2026-03-01', 2)).toBe(true);
    expect(await listBodyWeights(db)).toEqual([]);
    expect(await deleteBodyWeight(db, '2026-03-01', 3)).toBe(false);

    await saveBodyWeight(db, { date: '2026-03-01', kg: 81 }, 4);
    expect(await listBodyWeights(db)).toEqual([{ date: '2026-03-01', kg: 81 }]);
  });

  it('has to be a weight', async () => {
    await expect(saveBodyWeight(db, { date: '2026-03-01', kg: 0 }, 1)).rejects.toThrow(/CHECK/);
    await expect(saveBodyWeight(db, { date: '2026-03-01', kg: NaN }, 1)).rejects.toThrow(/NOT NULL/);
  });
});

describe('body measurements', () => {
  it('start with nothing measured', async () => {
    expect(await listBodyMeasurements(db)).toEqual([]);
  });

  it('are saved a day at a time and listed oldest first', async () => {
    await saveBodyMeasurements(db, '2026-03-01', { waist: 82, chest: 104.5 }, 1);
    await saveBodyMeasurements(db, '2026-01-10', { waist: 84 }, 2);

    expect(await listBodyMeasurements(db)).toEqual([
      { date: '2026-01-10', part: 'waist', cm: 84 },
      { date: '2026-03-01', part: 'chest', cm: 104.5 },
      { date: '2026-03-01', part: 'waist', cm: 82 },
    ]);
  });

  it('change only the body parts that are mentioned', async () => {
    await saveBodyMeasurements(db, '2026-03-01', { waist: 82, chest: 104.5, neck: 39 }, 1);
    await saveBodyMeasurements(db, '2026-03-01', { waist: 81, neck: null }, 2);

    expect(await listBodyMeasurements(db)).toEqual([
      { date: '2026-03-01', part: 'chest', cm: 104.5 },
      { date: '2026-03-01', part: 'waist', cm: 81 },
    ]);
  });

  it('can be entered again after being cleared', async () => {
    await saveBodyMeasurements(db, '2026-03-01', { waist: 82 }, 1);
    await saveBodyMeasurements(db, '2026-03-01', { waist: null }, 2);
    await saveBodyMeasurements(db, '2026-03-01', { waist: 80 }, 3);

    expect(await listBodyMeasurements(db)).toEqual([{ date: '2026-03-01', part: 'waist', cm: 80 }]);
  });

  it('take any body part a person names', async () => {
    await saveBodyMeasurements(db, '2026-03-01', { 'ліве зап\'ястя': 17.5 }, 1);
    expect(await listBodyMeasurements(db)).toEqual([{ date: '2026-03-01', part: "ліве зап'ястя", cm: 17.5 }]);
  });

  it('are all saved or none, inside a transaction', async () => {
    await expect(
      db.withExclusiveTransactionAsync((transaction) => saveBodyMeasurements(transaction, '2026-03-01', { waist: 82, chest: -1 }, 1)),
    ).rejects.toThrow(/CHECK/);

    expect(await listBodyMeasurements(db)).toEqual([]);
  });
});
