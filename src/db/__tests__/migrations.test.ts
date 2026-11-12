import { EXERCISE_KINDS } from '@/domain';

import { DatabaseTooNewError, migrate, MIGRATIONS, SCHEMA_VERSION, schemaVersion, type Migration } from '../migrations';

import { openEmptyDatabase, openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

/** A short fingerprint of a text: FNV-1a, 32 bits. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

const tableNames = async () =>
  (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", [])).map(
    (row) => row.name,
  );

describe('the list of migrations', () => {
  it('counts up from 1 without gaps', () => {
    expect(MIGRATIONS.map((migration) => migration.version)).toEqual(MIGRATIONS.map((_migration, index) => index + 1));
    expect(SCHEMA_VERSION).toBe(MIGRATIONS.length);
  });

  /*
   * A phone that has run a migration will never run it again. Editing one that is already
   * released changes nothing there and makes new installs differ from old ones. If this test
   * fails, put the change into a new migration and leave the old text as it was.
   */
  it('never changes a migration that is already released', () => {
    expect(MIGRATIONS.map((migration) => [migration.version, fingerprint(migration.sql)])).toEqual([[1, '96575309']]);
  });
});

describe('migrate', () => {
  it('builds the layout in an empty database', async () => {
    db = openEmptyDatabase();

    expect(await schemaVersion(db)).toBe(0);
    expect(await migrate(db)).toEqual({ from: 0, to: SCHEMA_VERSION });

    expect(await schemaVersion(db)).toBe(SCHEMA_VERSION);
    expect(await tableNames()).toEqual(['body_measurements', 'body_weights', 'entries', 'exercises', 'goals', 'profile']);
  });

  it('makes every table strict about types', async () => {
    db = await openTestDatabase();

    const tables = await db.getAllAsync<{ name: string; strict: number }>(
      "SELECT name, strict FROM pragma_table_list WHERE schema = 'main' AND name NOT LIKE 'sqlite_%'",
      [],
    );
    expect(tables.length).toBe(6);
    expect(tables.filter((table) => table.strict !== 1)).toEqual([]);
  });

  it('does nothing when the database is already up to date', async () => {
    db = await openTestDatabase();

    expect(await migrate(db)).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION });
    expect(db.statements).toEqual(['PRAGMA user_version']);
  });

  it('runs only the steps a database has not seen, and keeps what is in it', async () => {
    db = await openTestDatabase();
    await db.runAsync('INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, ?)', ['2026-11-12', 80, 1]);

    const next: Migration[] = [...MIGRATIONS, { version: SCHEMA_VERSION + 1, sql: 'ALTER TABLE body_weights ADD COLUMN note TEXT' }];
    expect(await migrate(db, next)).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION + 1 });

    expect(await db.getAllAsync('SELECT date, kg, note FROM body_weights', [])).toEqual([
      { date: '2026-11-12', kg: 80, note: null },
    ]);
    expect(await schemaVersion(db)).toBe(SCHEMA_VERSION + 1);
  });

  it('leaves the database as it was when a step fails, and picks up from there next time', async () => {
    db = await openTestDatabase();
    const broken: Migration[] = [
      ...MIGRATIONS,
      { version: SCHEMA_VERSION + 1, sql: 'CREATE TABLE half_done (id TEXT); CREATE TABLE oops (' },
    ];

    await expect(migrate(db, broken)).rejects.toThrow();

    expect(await schemaVersion(db)).toBe(SCHEMA_VERSION);
    expect(await tableNames()).not.toContain('half_done');

    const fixed: Migration[] = [...MIGRATIONS, { version: SCHEMA_VERSION + 1, sql: 'CREATE TABLE done (id TEXT)' }];
    expect(await migrate(db, fixed)).toEqual({ from: SCHEMA_VERSION, to: SCHEMA_VERSION + 1 });
    expect(await tableNames()).toContain('done');
  });

  it('refuses a database written by a newer version of the app, and does not touch it', async () => {
    db = await openTestDatabase();
    await db.execAsync('PRAGMA user_version = 99');
    db.statements.length = 0;

    const attempt = migrate(db);
    await expect(attempt).rejects.toThrow(DatabaseTooNewError);
    await expect(attempt).rejects.toMatchObject({ found: 99, known: SCHEMA_VERSION });

    expect(db.statements).toEqual(['PRAGMA user_version']);
  });
});

describe('the layout', () => {
  beforeEach(async () => {
    db = await openTestDatabase();
  });

  const insertExercise = (overrides: Record<string, string | number | null>) => {
    const row = { id: 'x', kind: 'count', better: 'higher', name: 'Присідання', unit: null, distance_unit: null, ...overrides };
    return db.runAsync(
      'INSERT INTO exercises (id, kind, better, name, unit, distance_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
      [row.id, row.kind, row.better, row.name, row.unit, row.distance_unit],
    );
  };

  const insertEntry = (date: string | number, reps: string | number | null = 10, createdAt: number = 1) =>
    db.runAsync('INSERT INTO entries (id, exercise_id, date, reps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
      `e-${date}`,
      'pullups',
      date,
      reps,
      createdAt,
      1,
    ]);

  it('accepts every kind of exercise the app knows, and no other', async () => {
    for (const kind of EXERCISE_KINDS) {
      await expect(insertExercise({ id: kind, kind })).resolves.toEqual({ changes: 1 });
    }
    await expect(insertExercise({ id: 'unknown', kind: 'swimming' })).rejects.toThrow(/CHECK/);
  });

  it('accepts only the two directions and the two distance units', async () => {
    await expect(insertExercise({ id: 'a', better: null, distance_unit: 'km' })).resolves.toEqual({ changes: 1 });
    await expect(insertExercise({ id: 'b', better: 'lower', distance_unit: 'm' })).resolves.toEqual({ changes: 1 });
    await expect(insertExercise({ id: 'c', better: 'sideways' })).rejects.toThrow(/CHECK/);
    await expect(insertExercise({ id: 'd', distance_unit: 'mile' })).rejects.toThrow(/CHECK/);
  });

  it('wants a custom exercise to have a name', async () => {
    await expect(insertExercise({ name: '   ' })).rejects.toThrow(/CHECK/);
  });

  it('accepts a day only as YYYY-MM-DD', async () => {
    await expect(insertEntry('2026-11-12')).resolves.toEqual({ changes: 1 });
    await expect(insertEntry('12.11.2026')).rejects.toThrow(/CHECK/);
    await expect(insertEntry('2026-11-12T10:00')).rejects.toThrow(/CHECK/);
    await expect(db.runAsync('INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, 1)', ['today', 80])).rejects.toThrow(
      /CHECK/,
    );
  });

  it('refuses a value of the wrong type', async () => {
    await expect(insertEntry('2026-11-12', 'багато')).rejects.toThrow(/cannot store TEXT value in REAL column/);
    await expect(insertEntry('2026-11-13', 10, 1.5)).rejects.toThrow(/cannot store REAL value in INTEGER column/);
  });

  it('keeps whole and fractional numbers as they are', async () => {
    await db.runAsync(
      'INSERT INTO entries (id, exercise_id, date, reps, load_kg, duration_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['e1', 'pullups', '2026-11-12', 12, 7.5, 41_000, 1_770_000_000_123, 1_770_000_000_456],
    );

    expect(await db.getFirstAsync('SELECT reps, load_kg, duration_ms, created_at, updated_at FROM entries', [])).toEqual({
      reps: 12,
      load_kg: 7.5,
      duration_ms: 41_000,
      created_at: 1_770_000_000_123,
      updated_at: 1_770_000_000_456,
    });
  });

  it('refuses weights, measurements and goals that are not above zero', async () => {
    await expect(db.runAsync('INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, 1)', ['2026-11-12', 0])).rejects.toThrow(
      /CHECK/,
    );
    await expect(
      db.runAsync('INSERT INTO body_measurements (date, part, cm, updated_at) VALUES (?, ?, ?, 1)', ['2026-11-12', 'waist', -1]),
    ).rejects.toThrow(/CHECK/);
    await expect(db.runAsync('INSERT INTO goals (discipline, target, updated_at) VALUES (?, ?, 1)', ['pullups', 0])).rejects.toThrow(
      /CHECK/,
    );
  });

  it('holds one weigh-in a day, one measurement of a body part a day, one goal a discipline', async () => {
    await db.runAsync('INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, 1)', ['2026-11-12', 80]);
    await expect(db.runAsync('INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, 1)', ['2026-11-12', 81])).rejects.toThrow(
      /UNIQUE/,
    );

    await db.runAsync('INSERT INTO body_measurements (date, part, cm, updated_at) VALUES (?, ?, ?, 1)', ['2026-11-12', 'waist', 80]);
    await db.runAsync('INSERT INTO body_measurements (date, part, cm, updated_at) VALUES (?, ?, ?, 1)', ['2026-11-12', 'chest', 100]);
    await expect(
      db.runAsync('INSERT INTO body_measurements (date, part, cm, updated_at) VALUES (?, ?, ?, 1)', ['2026-11-12', 'waist', 81]),
    ).rejects.toThrow(/UNIQUE/);

    await db.runAsync('INSERT INTO goals (discipline, target, updated_at) VALUES (?, ?, 1)', ['run@5000', 1_200_000]);
    await expect(db.runAsync('INSERT INTO goals (discipline, target, updated_at) VALUES (?, ?, 1)', ['run@5000', 1])).rejects.toThrow(
      /UNIQUE/,
    );
  });
});
