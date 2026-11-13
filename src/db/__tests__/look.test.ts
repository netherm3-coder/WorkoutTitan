import { DEFAULT_LOOK, type Look } from '@/domain';

import { loadLook, saveLook } from '../look';
import { loadProfile, saveProfile } from '../profile';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

const write = (key: string, value: string) =>
  db.runAsync('INSERT INTO profile (key, value, updated_at) VALUES (?, ?, 1)', [key, value]);

const stored = () => db.getAllAsync<{ key: string; value: string; updated_at: number }>('SELECT * FROM profile ORDER BY key', []);

describe('the look of the camp', () => {
  it('is the starting one until something is chosen', async () => {
    expect(await loadLook(db)).toEqual(DEFAULT_LOOK);
  });

  it('keeps what is saved and leaves the other slots alone', async () => {
    await saveLook(db, { armour: 'red', hat: 'cowboy' }, 1);
    await saveLook(db, { sky: 'starry' }, 2);

    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, armour: 'red', hat: 'cowboy', sky: 'starry' });
  });

  it('keeps a whole look', async () => {
    const look: Look = { armour: 'blue', hat: 'duck', tent: 'pink', pattern: 'waves', patternColour: 'yellow', sky: 'rain', season: 'cherry' };
    await saveLook(db, look, 1);

    expect(await loadLook(db)).toEqual(look);
  });

  it('takes a hat off again', async () => {
    await saveLook(db, { hat: 'crown', pattern: 'dots' }, 1);
    await saveLook(db, { hat: null }, 2);

    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, pattern: 'dots' });
  });

  it('remembers when each slot was changed, for a later sync', async () => {
    await saveLook(db, { armour: 'red', hat: 'cowboy' }, 10);
    await saveLook(db, { hat: 'crown' }, 20);

    expect(await stored()).toEqual([
      { key: 'look.armour', value: '"red"', updated_at: 10 },
      { key: 'look.hat', value: '"crown"', updated_at: 20 },
    ]);
  });

  it('refuses an item the slot does not offer and saves nothing of it', async () => {
    await expect(saveLook(db, { armour: 'chrome' as Look['armour'] }, 1)).rejects.toThrow(RangeError);
    await expect(saveLook(db, { armour: null as unknown as Look['armour'] }, 1)).rejects.toThrow(RangeError);
    await expect(saveLook(db, { armour: 'red', sky: 'green' as Look['sky'] }, 1)).rejects.toThrow(RangeError);

    expect(await stored()).toEqual([]);
  });

  it('reads a stored value that makes no sense as never chosen', async () => {
    await write('look.armour', '"chrome"');
    await write('look.hat', '{broken json');
    await write('look.sky', '7');
    await write('look.season', '"winter"');

    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, season: 'winter' });
  });

  it('lives next to the profile without either reading the other', async () => {
    await saveProfile(db, { heightCm: 181 }, 1);
    await saveLook(db, { tent: 'blue' }, 2);
    await write('lookalike', '"red"');

    expect(await loadProfile(db)).toEqual({ heightCm: 181, trainingSince: null, soberSince: null });
    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, tent: 'blue' });
  });
});
