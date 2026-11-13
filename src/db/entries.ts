import type { WorkoutEntry } from '@/domain';

import type { Database, SqlValue } from './types';

type EntryRow = {
  id: string;
  exercise_id: string;
  date: string;
  reps: number | null;
  load_kg: number | null;
  duration_ms: number | null;
  distance_m: number | null;
  segments: number | null;
  value: number | null;
  text: string | null;
  note: string;
  video_url: string;
  result_url: string;
  created_at: number;
};

const COLUMNS = [
  'id',
  'exercise_id',
  'date',
  'reps',
  'load_kg',
  'duration_ms',
  'distance_m',
  'segments',
  'value',
  'text',
  'note',
  'video_url',
  'result_url',
  'created_at',
] as const;

/** Oldest first, entries of one day in the order they were written: the order the domain works in. */
export const LIST_ENTRIES = `SELECT ${COLUMNS.join(', ')} FROM entries WHERE deleted_at IS NULL ORDER BY date, created_at, id`;

/** SQLite has no place for "not a number" or infinity, and neither is a measurement. */
const number = (value: number | null): number | null => (value !== null && Number.isFinite(value) ? value : null);

function toEntry(row: EntryRow): WorkoutEntry {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    date: row.date,
    createdAt: row.created_at,
    reps: row.reps,
    loadKg: row.load_kg,
    durationMs: row.duration_ms,
    distanceM: row.distance_m,
    segments: row.segments,
    value: row.value,
    text: row.text,
    note: row.note,
    videoUrl: row.video_url,
    resultUrl: row.result_url,
  };
}

/** The values of an entry in the order of `COLUMNS`. */
function toParams(entry: WorkoutEntry): SqlValue[] {
  return [
    entry.id,
    entry.exerciseId,
    entry.date,
    number(entry.reps),
    number(entry.loadKg),
    number(entry.durationMs),
    number(entry.distanceM),
    number(entry.segments),
    number(entry.value),
    entry.text,
    entry.note,
    entry.videoUrl,
    entry.resultUrl,
    entry.createdAt,
  ];
}

/** Every entry that has not been deleted. */
export async function listEntries(db: Database): Promise<WorkoutEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(LIST_ENTRIES, []);
  return rows.map(toEntry);
}

/** One entry by its id; `null` if there is none or it was deleted. */
export async function getEntry(db: Database, id: string): Promise<WorkoutEntry | null> {
  const row = await db.getFirstAsync<EntryRow>(
    `SELECT ${COLUMNS.join(', ')} FROM entries WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? toEntry(row) : null;
}

/** So many rows go into one statement. Far below SQLite's limit on parameters, and quick. */
const ROWS_PER_INSERT = 100;

/**
 * Adds entries. An id that is already taken is an error. To add many as one change that either
 * happens completely or not at all, call this inside a transaction.
 */
export async function addEntries(db: Database, entries: readonly WorkoutEntry[], now: number): Promise<void> {
  const row = `(${COLUMNS.map(() => '?').join(', ')}, ?)`;

  for (let start = 0; start < entries.length; start += ROWS_PER_INSERT) {
    const chunk = entries.slice(start, start + ROWS_PER_INSERT);
    await db.runAsync(
      `INSERT INTO entries (${COLUMNS.join(', ')}, updated_at) VALUES ${chunk.map(() => row).join(', ')}`,
      chunk.flatMap((entry) => [...toParams(entry), now]),
    );
  }
}

/**
 * Adds entries, and where an id is already taken puts the given entry in its place: the way a
 * backup comes back. An entry that had been deleted returns. Call inside a transaction.
 */
export async function putEntries(db: Database, entries: readonly WorkoutEntry[], now: number): Promise<void> {
  const row = `(${COLUMNS.map(() => '?').join(', ')}, ?)`;
  const replaced = COLUMNS.filter((column) => column !== 'id').map((column) => `${column} = excluded.${column}`);

  for (let start = 0; start < entries.length; start += ROWS_PER_INSERT) {
    const chunk = entries.slice(start, start + ROWS_PER_INSERT);
    await db.runAsync(
      `INSERT INTO entries (${COLUMNS.join(', ')}, updated_at) VALUES ${chunk.map(() => row).join(', ')}
       ON CONFLICT (id) DO UPDATE SET ${replaced.join(', ')}, updated_at = excluded.updated_at, deleted_at = NULL`,
      chunk.flatMap((entry) => [...toParams(entry), now]),
    );
  }
}

export async function addEntry(db: Database, entry: WorkoutEntry, now: number): Promise<void> {
  await addEntries(db, [entry], now);
}

/**
 * Replaces an entry with an edited one. When it was first written stays as it was.
 * `false` if there is no such entry any more.
 */
export async function updateEntry(db: Database, entry: WorkoutEntry, now: number): Promise<boolean> {
  const edited = COLUMNS.filter((column) => column !== 'id' && column !== 'created_at');
  const values = toParams(entry).filter((_value, index) => COLUMNS[index] !== 'id' && COLUMNS[index] !== 'created_at');

  const { changes } = await db.runAsync(
    `UPDATE entries SET ${edited.map((column) => `${column} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [...values, now, entry.id],
  );
  return changes > 0;
}

/** Marks an entry as deleted. It can be brought back with `restoreEntry`. */
export async function deleteEntry(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id],
  );
  return changes > 0;
}

/** Brings a deleted entry back. */
export async function restoreEntry(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE entries SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
    [now, id],
  );
  return changes > 0;
}
