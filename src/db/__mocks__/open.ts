import { openEmptyDatabase } from '../__tests__/testDatabase';
import { migrate } from '../migrations';
import type { Connection } from '../types';

/**
 * What tests get instead of the database on a phone: a real SQLite database in memory with the
 * app's layout. Every start of the app gets a new, empty one, so tests do not see each other's
 * data. A test can hand over its own with `mockResolvedValueOnce`, or make opening fail.
 */
export const openRecordDatabase = jest.fn(async (): Promise<Connection> => {
  const database = openEmptyDatabase();
  await migrate(database);
  return database;
});
