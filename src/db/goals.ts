import type { Database } from './types';

/**
 * The goals a person has set, by discipline ("pullups", "run@5000"). A goal is in the number
 * the discipline is measured by: reps, kilograms, or milliseconds for anything timed.
 */
export async function listGoals(db: Database): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ discipline: string; target: number }>(
    'SELECT discipline, target FROM goals WHERE deleted_at IS NULL ORDER BY discipline',
    [],
  );
  return new Map(rows.map((row) => [row.discipline, row.target]));
}

/**
 * Sets the goal of a discipline, replacing the one it had. Whether the number is a sensible
 * goal for that exercise is for the form to decide (`isValidGoal`); here it only has to be a
 * number above zero.
 */
export async function setGoal(db: Database, discipline: string, target: number, now: number): Promise<void> {
  if (!Number.isFinite(target) || target <= 0) {
    throw new RangeError(`${target} cannot be a goal`);
  }

  await db.runAsync(
    `INSERT INTO goals (discipline, target, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (discipline) DO UPDATE SET target = excluded.target, updated_at = excluded.updated_at, deleted_at = NULL`,
    [discipline, target, now],
  );
}

export async function clearGoal(db: Database, discipline: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE goals SET deleted_at = ?, updated_at = ? WHERE discipline = ? AND deleted_at IS NULL',
    [now, now, discipline],
  );
  return changes > 0;
}
