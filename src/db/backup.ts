import type { BackupData } from '@/backup/format';

import { listBodyMeasurements, saveBodyMeasurements, saveBodyWeight } from './body';
import { putEntries } from './entries';
import { listExercises, saveExercise } from './exercises';
import { listGoals, setGoal } from './goals';
import { loadHistory } from './history';
import { loadLook, saveLook } from './look';
import { loadProfile, saveProfile } from './profile';
import type { Database } from './types';

/** Everything that goes into a backup: what the person can see, nothing deleted. */
export async function collectBackupData(db: Database): Promise<BackupData> {
  const [history, exercises, bodyMeasurements, goals, profile, look] = await Promise.all([
    loadHistory(db),
    listExercises(db),
    listBodyMeasurements(db),
    listGoals(db),
    loadProfile(db),
    loadLook(db),
  ]);

  return {
    exercises,
    entries: [...history.entries],
    bodyWeights: [...history.weights],
    bodyMeasurements,
    goals: [...goals].map(([discipline, target]) => ({ discipline, target })),
    profile,
    look,
  };
}

/** What bringing a backup in would do to the entries, worked out without changing anything. */
export type RestorePlan = {
  /** Entries in the file that the phone does not have. */
  newEntries: number;
  /** Entries the phone already has under the same id; the file's version replaces them. */
  replacedEntries: number;
};

export async function planRestore(db: Database, data: BackupData): Promise<RestorePlan> {
  const rows = await db.getAllAsync<{ id: string }>('SELECT id FROM entries WHERE deleted_at IS NULL', []);
  const onPhone = new Set(rows.map((row) => row.id));
  const replacedEntries = data.entries.filter((entry) => onPhone.has(entry.id)).length;

  return { newEntries: data.entries.length - replacedEntries, replacedEntries };
}

/**
 * Brings a backup in. Nothing on the phone is deleted: the file is added to what is there, and
 * where both have the same thing (an entry with the same id, a weight on the same day, a goal
 * for the same discipline) the file's version stands. A profile field the file leaves empty
 * keeps the phone's value.
 *
 * Call inside a transaction, so a failure half way leaves the phone as it was.
 */
export async function restoreBackup(db: Database, data: BackupData, now: number): Promise<void> {
  for (const exercise of data.exercises) {
    await saveExercise(db, exercise, now);
  }
  await putEntries(db, data.entries, now);

  for (const record of data.bodyWeights) {
    await saveBodyWeight(db, record, now);
  }

  const byDate = new Map<string, Record<string, number>>();
  for (const { date, part, cm } of data.bodyMeasurements) {
    byDate.set(date, { ...byDate.get(date), [part]: cm });
  }
  for (const [date, values] of byDate) {
    await saveBodyMeasurements(db, date, values, now);
  }

  for (const { discipline, target } of data.goals) {
    await setGoal(db, discipline, target, now);
  }

  const { heightCm, trainingSince, soberSince } = data.profile;
  await saveProfile(
    db,
    {
      ...(heightCm !== null && { heightCm }),
      ...(trainingSince !== null && { trainingSince }),
      ...(soberSince !== null && { soberSince }),
    },
    now,
  );
  await saveLook(db, data.look, now);
}
