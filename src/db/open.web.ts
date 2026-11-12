import initSqlJs from 'sql.js/dist/sql-wasm-inline.js';

import { migrate } from './migrations';
import type { Connection, Database, SqlValue } from './types';

/*
 * The browser version exists only to look at the app during development; the product runs on
 * phones. Here the database is SQLite in memory: it works exactly like the real one and is
 * empty again after the page is reloaded.
 */

let opening: Promise<Connection> | null = null;

export function openRecordDatabase(): Promise<Connection> {
  opening ??= open().catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

async function open(): Promise<Connection> {
  const { Database: SqlJsDatabase } = await initSqlJs();
  const sqlite = new SqlJsDatabase();

  const rows = <Row>(source: string, params: SqlValue[]): Row[] => {
    const statement = sqlite.prepare(source);
    try {
      statement.bind(params);
      const found: Row[] = [];
      while (statement.step()) found.push(statement.getAsObject() as Row);
      return found;
    } finally {
      statement.free();
    }
  };

  const database: Database = {
    async execAsync(source) {
      sqlite.exec(source);
    },
    async runAsync(source, params) {
      sqlite.run(source, params);
      return { changes: sqlite.getRowsModified() };
    },
    async getAllAsync<Row>(source: string, params: SqlValue[]) {
      return rows<Row>(source, params);
    },
    async getFirstAsync<Row>(source: string, params: SqlValue[]) {
      return rows<Row>(source, params)[0] ?? null;
    },
  };

  const connection: Connection = {
    ...database,
    async withExclusiveTransactionAsync(task) {
      sqlite.exec('BEGIN');
      try {
        await task(database);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };

  await migrate(connection);
  return connection;
}
