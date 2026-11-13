import { isLookOption, readLook, SLOTS, type Look } from '@/domain';

import type { Database } from './types';

/*
 * The chosen look of the camp. It is kept next to the profile, one row per slot under the key
 * `look.<slot>`: like the profile it goes with the person rather than with the phone, so it
 * belongs in a backup and on a second device. Keeping it there needs no new table.
 *
 * What is stored is the choice, not what is open. Whether an item may be worn is worked out
 * from the achievements each time (`wearable`).
 */

const PREFIX = 'look.';

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The chosen look. A slot never chosen, or holding something unknown, has the starting choice. */
export async function loadLook(db: Database): Promise<Look> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM profile WHERE key GLOB 'look.*'",
    [],
  );

  return readLook(Object.fromEntries(rows.map((row) => [row.key.slice(PREFIX.length), parse(row.value)])));
}

/** Saves the slots that are given and leaves the others as they are. */
export async function saveLook(db: Database, changes: Partial<Look>, now: number): Promise<void> {
  const chosen = SLOTS.filter((slot) => changes[slot] !== undefined);

  // Checked before anything is written, so a bad item cannot leave half a change behind.
  for (const slot of chosen) {
    if (!isLookOption(slot, changes[slot])) {
      throw new RangeError(`${String(changes[slot])} is not something the ${slot} slot offers`);
    }
  }

  for (const slot of chosen) {
    await db.runAsync(
      `INSERT INTO profile (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [`${PREFIX}${slot}`, JSON.stringify(changes[slot]), now],
    );
  }
}
