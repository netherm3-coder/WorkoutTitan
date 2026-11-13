import { fitRecordImport, type RecordImport } from '@/backup/recordImport';
import type { Conversion } from '@/domain';

import { addEntries } from './entries';
import { listExercises, saveExercise } from './exercises';
import type { Database } from './types';

/** Works out what bringing a converted Record history in would add. Changes nothing. */
export async function planRecordImport(
  db: Database,
  conversion: Conversion,
  nameFromRecord: (name: string) => string,
): Promise<RecordImport> {
  const [exercises, rows] = await Promise.all([
    listExercises(db),
    // Deleted entries count as known: what the person deleted stays deleted.
    db.getAllAsync<{ id: string }>('SELECT id FROM entries', []),
  ]);

  return fitRecordImport(conversion, exercises, new Set(rows.map((row) => row.id)), nameFromRecord);
}

/** Adds what `planRecordImport` found. Call inside a transaction. */
export async function importRecord(db: Database, plan: RecordImport, now: number): Promise<void> {
  for (const exercise of plan.exercises) {
    await saveExercise(db, exercise, now);
  }
  await addEntries(db, plan.entries, now);
}
