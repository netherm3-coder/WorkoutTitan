/** A value SQLite takes as a parameter or hands back in a row. */
export type SqlValue = string | number | null;

/**
 * The part of a database the app uses: run a statement, read rows. An open database and a
 * transaction are both one of these, so the same code works inside a transaction and outside.
 *
 * expo-sqlite's database has this shape as it is. Tests run the same code on Node's SQLite.
 */
export type Database = {
  /** Runs one or more statements that take no parameters and return nothing. */
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<Row>(source: string, params: SqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(source: string, params: SqlValue[]): Promise<Row | null>;
};

/** An open database. It can also make several changes as one: all of them or none. */
export type Connection = Database & {
  /**
   * Runs `task` in a transaction: committed when it resolves, rolled back when it throws.
   * Everything inside has to go through the `transaction` it is given, not the connection.
   * Transactions do not nest.
   */
  withExclusiveTransactionAsync(task: (transaction: Database) => Promise<void>): Promise<void>;
};
