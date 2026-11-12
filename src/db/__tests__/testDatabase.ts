import { DatabaseSync } from 'node:sqlite';

import { migrate } from '../migrations';
import type { Connection, Database, SqlValue } from '../types';

export type TestDatabase = Connection & {
  /** Every statement that was run, for tests that care how the database was used. */
  statements: string[];
};

/**
 * A real SQLite database in memory, behind the same narrow interface the app uses on a phone.
 * Node ships nearly the same SQLite release as expo-sqlite does (3.53), so what passes here is
 * what the phone will run. It lives as long as something holds on to it.
 */
export function openEmptyDatabase(): TestDatabase {
  const sqlite = new DatabaseSync(':memory:');
  const statements: string[] = [];
  let inTransaction = false;

  const database: Database = {
    async execAsync(source) {
      statements.push(source);
      sqlite.exec(source);
    },
    async runAsync(source, params: SqlValue[]) {
      statements.push(source);
      return { changes: Number(sqlite.prepare(source).run(...params).changes) };
    },
    async getAllAsync<Row>(source: string, params: SqlValue[]) {
      statements.push(source);
      // Rows come without a prototype; copying makes them ordinary objects.
      return sqlite.prepare(source).all(...params).map((row) => ({ ...row }) as Row);
    },
    async getFirstAsync<Row>(source: string, params: SqlValue[]) {
      statements.push(source);
      const row = sqlite.prepare(source).get(...params);
      return row ? ({ ...row } as Row) : null;
    },
  };

  // On a phone a transaction runs on a connection of its own. A write that goes around it, or a
  // second transaction, would wait for the first one to finish. Here both fail at once instead.
  const outside = <Args extends unknown[], Result>(run: (...args: Args) => Promise<Result>) => {
    return async (...args: Args): Promise<Result> => {
      if (inTransaction) throw new Error('Inside a transaction, write through the transaction it gives you');
      return run(...args);
    };
  };

  return {
    ...database,
    execAsync: outside(database.execAsync),
    runAsync: outside(database.runAsync),
    statements,
    async withExclusiveTransactionAsync(task) {
      if (inTransaction) throw new Error('Transactions do not nest');

      inTransaction = true;
      sqlite.exec('BEGIN');
      try {
        await task(database);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      } finally {
        inTransaction = false;
      }
    },
  };
}

/** A database with the app's current layout and nothing in it. */
export async function openTestDatabase(): Promise<TestDatabase> {
  const database = openEmptyDatabase();
  await migrate(database);
  database.statements.length = 0;
  return database;
}
