import { isBuiltInPart, type OwnBodyPart } from '@/domain';

import type { Database } from './types';

/** Body parts of the person's own, in the order they were added. */
export async function listBodyParts(db: Database): Promise<OwnBodyPart[]> {
  return db.getAllAsync<OwnBodyPart>('SELECT id, name FROM body_parts WHERE deleted_at IS NULL ORDER BY created_at, id', []);
}

/** A deleted part of the person's own, with the measurements that went out of sight with it. */
export type DeletedBodyPart = { part: OwnBodyPart; measurements: number };

/** The person's deleted body parts, the most recently deleted first. */
export async function listDeletedBodyParts(db: Database): Promise<DeletedBodyPart[]> {
  const rows = await db.getAllAsync<OwnBodyPart & { measurements: number }>(
    `SELECT p.id, p.name,
       (SELECT COUNT(*) FROM body_measurements m WHERE m.part = p.id AND m.deleted_at IS NULL) AS measurements
     FROM body_parts p
     WHERE p.deleted_at IS NOT NULL
     ORDER BY p.deleted_at DESC, p.id`,
    [],
  );
  return rows.map(({ measurements, ...part }) => ({ part, measurements }));
}

/**
 * Adds a body part of the person's own, or renames one. A deleted part saved again comes back.
 * Refuses a built-in part and an empty name.
 */
export async function saveBodyPart(db: Database, part: OwnBodyPart, now: number): Promise<void> {
  const name = part.name.trim();
  if (part.id === '' || isBuiltInPart(part.id)) {
    throw new RangeError(`"${part.id}" cannot be a body part of the person's own`);
  }
  if (name === '') {
    throw new RangeError('A body part needs a name');
  }

  await db.runAsync(
    `INSERT INTO body_parts (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, deleted_at = NULL`,
    [part.id, name, now, now],
  );
}

/**
 * Makes sure every part that measurements name has a definition: a part that is neither built
 * in nor known yet becomes one of the person's own, named the way it is written. What is
 * already known, deleted or not, is left as it is.
 */
export async function ensureBodyParts(db: Database, parts: Iterable<string>, now: number): Promise<void> {
  for (const part of new Set(parts)) {
    if (isBuiltInPart(part) || part.trim() === '') continue;
    await db.runAsync('INSERT OR IGNORE INTO body_parts (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      part,
      part.trim(),
      now,
      now,
    ]);
  }
}

/** Deletes a part of the person's own. Its measurements stay in the database, out of sight. */
export async function deleteBodyPart(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE body_parts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [now, now, id],
  );
  return changes > 0;
}

/** Brings a deleted part back, with its measurements. */
export async function restoreBodyPart(db: Database, id: string, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE body_parts SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL',
    [now, id],
  );
  return changes > 0;
}
