/**
 * The few parts of sql.js that the web preview uses. sql.js is SQLite compiled for browsers;
 * this build carries its WebAssembly inside the JavaScript file, so there is nothing to host.
 */
declare module 'sql.js/dist/sql-wasm-inline.js' {
  type Value = string | number | null | Uint8Array;

  export type SqlJsStatement = {
    bind(params: Value[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, Value>;
    free(): boolean;
  };

  export type SqlJsDatabase = {
    exec(source: string): unknown;
    run(source: string, params?: Value[]): void;
    prepare(source: string): SqlJsStatement;
    getRowsModified(): number;
  };

  export default function initSqlJs(): Promise<{ Database: new () => SqlJsDatabase }>;
}
