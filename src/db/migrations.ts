import type { Connection, Database } from './types';

/**
 * One step in the history of the database layout. Steps are applied in order and never edited
 * once released: a phone that already ran step 1 will only ever run the steps after it.
 */
export type Migration = {
  /** Counts up from 1 without gaps. The database remembers the last one it ran. */
  version: number;
  sql: string;
};

/*
 * Notes on the layout:
 *
 * - Everything is metric and numeric, as in the domain: kilograms, metres, milliseconds.
 * - Days are text, 'YYYY-MM-DD', which sorts and compares correctly as text.
 * - Rows are never removed. `deleted_at` marks a row as deleted; a later sync between devices
 *   needs to know what was deleted, and it also makes "undo" possible. `updated_at` says which
 *   copy of a row is newer.
 * - Things with a natural key use it (a weigh-in is its day, a goal is its discipline); only
 *   entries and exercises have ids of their own.
 * - `entries.exercise_id` is not a foreign key: built-in exercises live in code, not in the
 *   `exercises` table, which only holds the person's own.
 * - Tables are STRICT, so a value of the wrong type is an error instead of silent garbage.
 */

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE exercises (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL
          CHECK (kind IN ('bodyweight', 'weight', 'distanceTime', 'shuttle', 'duration', 'count', 'text')),
        better TEXT CHECK (better IN ('higher', 'lower')),
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        unit TEXT,
        distance_unit TEXT CHECK (distance_unit IN ('km', 'm')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      ) STRICT;

      CREATE TABLE entries (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_id TEXT NOT NULL,
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        reps REAL,
        load_kg REAL,
        duration_ms REAL,
        distance_m REAL,
        segments REAL,
        value REAL,
        text TEXT,
        note TEXT NOT NULL DEFAULT '',
        video_url TEXT NOT NULL DEFAULT '',
        result_url TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      ) STRICT;

      CREATE INDEX entries_in_order ON entries (date, created_at, id) WHERE deleted_at IS NULL;

      CREATE TABLE body_weights (
        date TEXT PRIMARY KEY NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        kg REAL NOT NULL CHECK (kg > 0),
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      ) STRICT;

      CREATE TABLE body_measurements (
        date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        part TEXT NOT NULL CHECK (length(part) > 0),
        cm REAL NOT NULL CHECK (cm > 0),
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        PRIMARY KEY (date, part)
      ) STRICT;

      CREATE TABLE goals (
        discipline TEXT PRIMARY KEY NOT NULL,
        target REAL NOT NULL CHECK (target > 0),
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      ) STRICT;

      CREATE TABLE profile (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      ) STRICT;
    `,
  },
  /*
   * Body parts of the person's own. A measurement keeps the id of its part, so a part can be
   * renamed or deleted without touching its measurements.
   *
   * Before this step a measurement could already name a part the app did not know: a backup
   * file accepted any name. Each such name becomes a part of the person's own, named the way it
   * was written, so nothing measured goes out of sight. The list is the built-in parts as they
   * were at this step; a later change to that list does not change this step.
   */
  {
    version: 2,
    sql: `
      CREATE TABLE body_parts (
        id TEXT PRIMARY KEY NOT NULL CHECK (length(id) > 0),
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      ) STRICT;

      INSERT INTO body_parts (id, name, created_at, updated_at)
      SELECT part, part, MIN(updated_at), MAX(updated_at)
      FROM body_measurements
      WHERE deleted_at IS NULL
        AND length(trim(part)) > 0
        AND part NOT IN ('neck', 'shoulders', 'chest', 'waist', 'bicep', 'forearm', 'thigh', 'calf')
      GROUP BY part;
    `,
  },
];

const latestOf = (migrations: readonly Migration[]) =>
  migrations.reduce((latest, migration) => Math.max(latest, migration.version), 0);

/** The layout this version of the app works with. */
export const SCHEMA_VERSION = latestOf(MIGRATIONS);

/**
 * The database was written by a newer version of the app than this one. Opening it anyway
 * could damage it, so nothing is touched.
 */
export class DatabaseTooNewError extends Error {
  constructor(
    readonly found: number,
    readonly known: number,
  ) {
    super(`The database has layout ${found}, but this version of the app only knows layout ${known}.`);
    this.name = 'DatabaseTooNewError';
  }
}

export async function schemaVersion(db: Database): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

/**
 * Brings the database up to the layout this app works with. Each step runs in a transaction
 * of its own together with its version number, so a step that fails leaves the database
 * exactly as the previous step left it, and the next start tries again.
 */
export async function migrate(
  db: Connection,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<{ from: number; to: number }> {
  const from = await schemaVersion(db);
  const latest = latestOf(migrations);
  if (from > latest) {
    throw new DatabaseTooNewError(from, latest);
  }

  for (const migration of migrations) {
    if (migration.version <= from) continue;

    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migration.sql);
      await transaction.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return { from, to: latest };
}
