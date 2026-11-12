import { openDatabaseAsync } from 'expo-sqlite';

import { SCHEMA_VERSION, schemaVersion } from '../migrations';

import { openEmptyDatabase, type TestDatabase } from './testDatabase';

// This file tests the real way of opening the database, with only the native part replaced.
jest.unmock('../open');
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

const native = jest.mocked(openDatabaseAsync);

/** A fresh copy of the module, because it remembers the database it has opened. */
function load(): typeof import('../open') {
  let loaded: typeof import('../open') | undefined;
  jest.isolateModules(() => {
    loaded = jest.requireActual('../open');
  });
  if (!loaded) throw new Error('could not load the module');
  return loaded;
}

let sqlite: TestDatabase;

beforeEach(() => {
  sqlite = openEmptyDatabase();
  native.mockReset();
  native.mockResolvedValue(sqlite as unknown as Awaited<ReturnType<typeof openDatabaseAsync>>);
});

describe('openRecordDatabase', () => {
  it('opens the file, turns on write-ahead logging and builds the layout', async () => {
    const db = await load().openRecordDatabase();

    expect(native).toHaveBeenCalledWith('record.db');
    expect(sqlite.statements[0]).toBe('PRAGMA journal_mode = WAL');
    expect(await schemaVersion(db)).toBe(SCHEMA_VERSION);
  });

  it('opens the database once, however many ask for it', async () => {
    const { openRecordDatabase } = load();

    const [first, second] = await Promise.all([openRecordDatabase(), openRecordDatabase()]);
    const third = await openRecordDatabase();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(native).toHaveBeenCalledTimes(1);
  });

  it('tries again from the start after a failure', async () => {
    const { openRecordDatabase } = load();
    native.mockRejectedValueOnce(new Error('disk I/O error'));

    await expect(openRecordDatabase()).rejects.toThrow('disk I/O error');
    await expect(openRecordDatabase()).resolves.toBeDefined();

    expect(native).toHaveBeenCalledTimes(2);
  });

  it('fails when the layout cannot be built, and says why', async () => {
    await sqlite.execAsync('PRAGMA user_version = 99');

    await expect(load().openRecordDatabase()).rejects.toThrow(/layout 99/);
  });
});
