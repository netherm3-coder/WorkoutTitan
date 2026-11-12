/**
 * The few parts of Node's built-in SQLite that the test database uses. Declared here because
 * the project does not load Node's own type definitions: the app runs on a phone, not on Node.
 */
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;

  export class StatementSync {
    run(...params: Value[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: Value[]): Record<string, Value>[];
    get(...params: Value[]): Record<string, Value> | undefined;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(source: string): void;
    prepare(source: string): StatementSync;
    close(): void;
  }
}
