import { clearGoal, listGoals, setGoal } from '../goals';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

describe('goals', () => {
  it('start with none', async () => {
    expect(await listGoals(db)).toEqual(new Map());
  });

  it('are kept by discipline', async () => {
    await setGoal(db, 'pullups', 20, 1);
    await setGoal(db, 'run@5000', 1_200_000, 2);

    expect(await listGoals(db)).toEqual(
      new Map([
        ['pullups', 20],
        ['run@5000', 1_200_000],
      ]),
    );
  });

  it('are replaced by a new goal for the same discipline', async () => {
    await setGoal(db, 'pullups', 20, 1);
    await setGoal(db, 'pullups', 25, 2);

    expect(await listGoals(db)).toEqual(new Map([['pullups', 25]]));
  });

  it('can be cleared, and set again afterwards', async () => {
    await setGoal(db, 'pullups', 20, 1);

    expect(await clearGoal(db, 'pullups', 2)).toBe(true);
    expect(await listGoals(db)).toEqual(new Map());
    expect(await clearGoal(db, 'pullups', 3)).toBe(false);

    await setGoal(db, 'pullups', 30, 4);
    expect(await listGoals(db)).toEqual(new Map([['pullups', 30]]));
  });

  it.each([0, -5, NaN, Infinity])('do not accept %s', async (target) => {
    await expect(setGoal(db, 'pullups', target, 1)).rejects.toThrow(RangeError);
    expect(await listGoals(db)).toEqual(new Map());
  });
});
