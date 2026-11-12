import { isDay, type Day } from '@/domain';

import type { Database } from './types';

/**
 * Facts about the person that go with their history rather than with the phone: they belong in
 * a backup, and a second device should get them too. Language and skin are not here; those are
 * choices about this phone and live in its own settings.
 */
export type Profile = {
  /** For the body mass index. */
  heightCm: number | null;
  /** The day training started, for the experience counter. */
  trainingSince: Day | null;
  /** The first sober day. `null` means the sobriety counter is not used. */
  soberSince: Day | null;
};

export const EMPTY_PROFILE: Profile = { heightCm: null, trainingSince: null, soberSince: null };

const day = (value: unknown): Day | null => (isDay(value) ? value : null);

/** How each field is read back. A stored value that makes no sense counts as not set. */
const READ: { [Key in keyof Profile]: (value: unknown) => Profile[Key] } = {
  heightCm: (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null),
  trainingSince: day,
  soberSince: day,
};

const isField = (key: string): key is keyof Profile => Object.prototype.hasOwnProperty.call(READ, key);

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function loadProfile(db: Database): Promise<Profile> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM profile', []);

  const profile: Profile = { ...EMPTY_PROFILE };
  for (const row of rows) {
    // A key this version does not know was written by a newer one; it is left alone.
    if (isField(row.key)) {
      Object.assign(profile, { [row.key]: READ[row.key](parse(row.value)) });
    }
  }
  return profile;
}

/** Saves the fields that are given and leaves the others as they are. `null` clears a field. */
export async function saveProfile(db: Database, changes: Partial<Profile>, now: number): Promise<void> {
  for (const [key, value] of Object.entries(changes)) {
    if (!isField(key) || value === undefined) continue;

    await db.runAsync(
      `INSERT INTO profile (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, JSON.stringify(READ[key](value)), now],
    );
  }
}
