import { EMPTY_PROFILE, loadProfile, saveProfile } from '../profile';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

const write = (key: string, value: string) =>
  db.runAsync('INSERT INTO profile (key, value, updated_at) VALUES (?, ?, 1)', [key, value]);

describe('the profile', () => {
  it('starts with nothing set', async () => {
    expect(await loadProfile(db)).toEqual({ heightCm: null, trainingSince: null, soberSince: null });
    expect(await loadProfile(db)).not.toBe(EMPTY_PROFILE);
  });

  it('keeps what is saved and leaves the rest alone', async () => {
    await saveProfile(db, { heightCm: 181.5, soberSince: '2023-08-24' }, 1);
    await saveProfile(db, { trainingSince: '2023-01-21' }, 2);

    expect(await loadProfile(db)).toEqual({ heightCm: 181.5, trainingSince: '2023-01-21', soberSince: '2023-08-24' });
  });

  it('clears a field set to nothing, which turns the sobriety counter off', async () => {
    await saveProfile(db, { heightCm: 181.5, soberSince: '2023-08-24' }, 1);
    await saveProfile(db, { soberSince: null }, 2);

    expect(await loadProfile(db)).toEqual({ heightCm: 181.5, trainingSince: null, soberSince: null });
  });

  it('skips fields that are not given at all', async () => {
    await saveProfile(db, { heightCm: 181.5 }, 1);
    await saveProfile(db, { heightCm: undefined, soberSince: '2023-08-24' }, 2);

    expect(await loadProfile(db)).toMatchObject({ heightCm: 181.5, soberSince: '2023-08-24' });
  });

  it.each([
    ['a height below zero', { heightCm: -5 }],
    ['a height that is not a number', { heightCm: NaN }],
    ['a day that does not exist', { soberSince: '2026-02-30' }],
  ])('does not keep %s', async (_label, changes) => {
    await saveProfile(db, changes, 1);
    expect(await loadProfile(db)).toEqual(EMPTY_PROFILE);
  });

  it('reads a stored value that makes no sense as not set', async () => {
    await write('heightCm', '"tall"');
    await write('trainingSince', '20230121');
    await write('soberSince', '{broken json');

    expect(await loadProfile(db)).toEqual(EMPTY_PROFILE);
  });

  it('leaves alone what a newer version of the app wrote', async () => {
    await write('favouriteColour', '"teal"');
    await saveProfile(db, { heightCm: 180 }, 2);

    expect(await loadProfile(db)).toEqual({ ...EMPTY_PROFILE, heightCm: 180 });
    expect(await db.getAllAsync('SELECT key FROM profile ORDER BY key', [])).toEqual([{ key: 'favouriteColour' }, { key: 'heightCm' }]);
  });

  it('does not store a field it does not know', async () => {
    await saveProfile(db, { nickname: 'R' } as object, 1);
    expect(await db.getAllAsync('SELECT key FROM profile', [])).toEqual([]);
  });
});
