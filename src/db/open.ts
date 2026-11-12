import { openDatabaseAsync } from 'expo-sqlite';

import { migrate } from './migrations';
import type { Connection } from './types';

const FILE_NAME = 'record.db';

let opening: Promise<Connection> | null = null;

/**
 * Opens the database on the phone and brings its layout up to date. However often it is asked,
 * the database is opened once; after a failure the next call tries again from the start.
 */
export function openRecordDatabase(): Promise<Connection> {
  opening ??= open().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

async function open(): Promise<Connection> {
  const db: Connection = await openDatabaseAsync(FILE_NAME);
  // Write-ahead logging is the mode SQLite recommends for phones: a write does not block reads.
  await db.execAsync('PRAGMA journal_mode = WAL');
  await migrate(db);
  return db;
}
