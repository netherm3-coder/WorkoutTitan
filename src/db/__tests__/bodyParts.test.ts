import { listBodyMeasurements, saveBodyMeasurements } from '../body';
import {
  deleteBodyPart,
  ensureBodyParts,
  listBodyParts,
  listDeletedBodyParts,
  restoreBodyPart,
  saveBodyPart,
} from '../bodyParts';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

const WRIST = { id: 'own:wrist', name: 'Зап’ястя' };
const LEFT_CALF = { id: 'own:left-calf', name: 'Литка ліва' };

describe('body parts of the person’s own', () => {
  it('are listed in the order they were added', async () => {
    await saveBodyPart(db, LEFT_CALF, 20);
    await saveBodyPart(db, WRIST, 10);

    expect(await listBodyParts(db)).toEqual([WRIST, LEFT_CALF]);
  });

  it('are renamed in place, keeping their place in the list', async () => {
    await saveBodyPart(db, WRIST, 10);
    await saveBodyPart(db, LEFT_CALF, 20);

    await saveBodyPart(db, { ...WRIST, name: '  Зап’ястя праве ' }, 30);

    expect(await listBodyParts(db)).toEqual([{ ...WRIST, name: 'Зап’ястя праве' }, LEFT_CALF]);
  });

  it('refuse a built-in part, an empty id and an empty name', async () => {
    await expect(saveBodyPart(db, { id: 'waist', name: 'Талія' }, 1)).rejects.toThrow(RangeError);
    await expect(saveBodyPart(db, { id: '', name: 'Щось' }, 1)).rejects.toThrow(RangeError);
    await expect(saveBodyPart(db, { id: 'own:x', name: '   ' }, 1)).rejects.toThrow(RangeError);

    expect(await listBodyParts(db)).toEqual([]);
  });

  it('take their measurements out of sight when deleted, and bring them back', async () => {
    await saveBodyPart(db, WRIST, 1);
    await saveBodyMeasurements(db, '2026-03-01', { [WRIST.id]: 17, waist: 81 }, 1);
    await saveBodyMeasurements(db, '2026-04-01', { [WRIST.id]: 17.5 }, 1);

    expect(await deleteBodyPart(db, WRIST.id, 2)).toBe(true);
    expect(await listBodyParts(db)).toEqual([]);
    expect(await listBodyMeasurements(db)).toEqual([{ date: '2026-03-01', part: 'waist', cm: 81 }]);
    expect(await listDeletedBodyParts(db)).toEqual([{ part: WRIST, measurements: 2 }]);

    expect(await restoreBodyPart(db, WRIST.id, 3)).toBe(true);
    expect(await listBodyParts(db)).toEqual([WRIST]);
    expect(await listBodyMeasurements(db)).toHaveLength(3);
    expect(await listDeletedBodyParts(db)).toEqual([]);
  });

  it('say whether there was anything to delete or bring back', async () => {
    expect(await deleteBodyPart(db, 'own:none', 1)).toBe(false);
    expect(await restoreBodyPart(db, 'own:none', 1)).toBe(false);

    await saveBodyPart(db, WRIST, 1);
    expect(await restoreBodyPart(db, WRIST.id, 2)).toBe(false);
    await deleteBodyPart(db, WRIST.id, 3);
    expect(await deleteBodyPart(db, WRIST.id, 4)).toBe(false);
  });

  it('come back when saved again after being deleted', async () => {
    await saveBodyPart(db, WRIST, 1);
    await deleteBodyPart(db, WRIST.id, 2);

    await saveBodyPart(db, WRIST, 3);

    expect(await listBodyParts(db)).toEqual([WRIST]);
  });

  it('list the deleted ones most recent first, counting only measurements still kept', async () => {
    await saveBodyPart(db, WRIST, 1);
    await saveBodyPart(db, LEFT_CALF, 1);
    await saveBodyMeasurements(db, '2026-03-01', { [WRIST.id]: 17, [LEFT_CALF.id]: 39 }, 1);
    await saveBodyMeasurements(db, '2026-03-02', { [LEFT_CALF.id]: 39.5 }, 1);
    await saveBodyMeasurements(db, '2026-03-02', { [LEFT_CALF.id]: null }, 2);

    await deleteBodyPart(db, WRIST.id, 10);
    await deleteBodyPart(db, LEFT_CALF.id, 20);

    expect(await listDeletedBodyParts(db)).toEqual([
      { part: LEFT_CALF, measurements: 1 },
      { part: WRIST, measurements: 1 },
    ]);
  });
});

describe('ensureBodyParts', () => {
  it('names a part nobody defined after itself, and leaves built-in and known parts alone', async () => {
    await saveBodyPart(db, WRIST, 1);
    await deleteBodyPart(db, WRIST.id, 2);

    await ensureBodyParts(db, ['waist', WRIST.id, 'литка ліва', 'литка ліва', '  ', ' шия збоку '], 5);

    expect(await listBodyParts(db)).toEqual([
      { id: ' шия збоку ', name: 'шия збоку' },
      { id: 'литка ліва', name: 'литка ліва' },
    ]);
    expect(await listDeletedBodyParts(db)).toEqual([{ part: WRIST, measurements: 0 }]);
  });
});
