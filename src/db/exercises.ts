import { BUILT_IN_EXERCISES, type Direction, type Exercise, type ExerciseKind } from '@/domain';

import type { Database } from './types';

type ExerciseRow = {
  id: string;
  kind: ExerciseKind;
  better: Direction | null;
  name: string;
  unit: string | null;
  distance_unit: 'km' | 'm' | null;
};

const toExercise = (row: ExerciseRow): Exercise => ({
  id: row.id,
  kind: row.kind,
  better: row.better,
  builtIn: false,
  name: row.name,
  unit: row.unit,
  distanceUnit: row.distance_unit,
});

/** The person's own exercises that have not been deleted, in the order they were added. */
export async function listExercises(db: Database): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT id, kind, better, name, unit, distance_unit FROM exercises WHERE deleted_at IS NULL ORDER BY created_at, id',
    [],
  );
  return rows.map(toExercise);
}

/** An own exercise that was deleted, with the entries that left the history with it. */
export type DeletedExercise = { exercise: Exercise; entries: number };

/** The person's deleted exercises, the most recently deleted first. */
export async function listDeletedExercises(db: Database): Promise<DeletedExercise[]> {
  const rows = await db.getAllAsync<ExerciseRow & { entries: number }>(
    `SELECT x.id, x.kind, x.better, x.name, x.unit, x.distance_unit,
       (SELECT COUNT(*) FROM entries e WHERE e.exercise_id = x.id AND e.deleted_at IS NULL) AS entries
     FROM exercises x
     WHERE x.deleted_at IS NOT NULL
     ORDER BY x.deleted_at DESC, x.id`,
    [],
  );
  return rows.map(({ entries, ...row }) => ({ exercise: toExercise(row), entries }));
}

/**
 * Adds one of the person's own exercises, or replaces it if it is already there. Saving a
 * deleted exercise brings it back. Built-in exercises live in code and cannot be saved.
 */
export async function saveExercise(db: Database, exercise: Exercise, now: number): Promise<void> {
  if (exercise.builtIn || BUILT_IN_EXERCISES.some((builtIn) => builtIn.id === exercise.id)) {
    throw new Error(`"${exercise.id}" is a built-in exercise and is not stored`);
  }

  await db.runAsync(
    `INSERT INTO exercises (id, kind, better, name, unit, distance_unit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       kind = excluded.kind,
       better = excluded.better,
       name = excluded.name,
       unit = excluded.unit,
       distance_unit = excluded.distance_unit,
       updated_at = excluded.updated_at,
       deleted_at = NULL`,
    [exercise.id, exercise.kind, exercise.better, exercise.name ?? '', exercise.unit, exercise.distanceUnit, now, now],
  );
}

/**
 * Marks an exercise as deleted. Its entries stay in the database but drop out of the history
 * until the exercise is brought back.
 */
export async function deleteExercise(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id],
  );
  return changes > 0;
}

/** Brings a deleted exercise back, and its entries with it. */
export async function restoreExercise(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE exercises SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
    [now, id],
  );
  return changes > 0;
}
