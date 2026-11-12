import type { BodyMeasurement, Day, WeightRecord } from '@/domain';

import type { Database } from './types';

/** Every weigh-in that has not been deleted, oldest first. */
export async function listBodyWeights(db: Database): Promise<WeightRecord[]> {
  return db.getAllAsync<WeightRecord>('SELECT date, kg FROM body_weights WHERE deleted_at IS NULL ORDER BY date', []);
}

/** Records the weight of a day. A day has one weight: saving again replaces it. */
export async function saveBodyWeight(db: Database, record: WeightRecord, now: number): Promise<void> {
  await db.runAsync(
    `INSERT INTO body_weights (date, kg, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET kg = excluded.kg, updated_at = excluded.updated_at, deleted_at = NULL`,
    [record.date, record.kg, now],
  );
}

export async function deleteBodyWeight(db: Database, date: Day, now: number): Promise<boolean> {
  const { changes } = await db.runAsync(
    'UPDATE body_weights SET deleted_at = ?, updated_at = ? WHERE date = ? AND deleted_at IS NULL',
    [now, now, date],
  );
  return changes > 0;
}

/** Every tape measurement that has not been deleted, oldest day first. */
export async function listBodyMeasurements(db: Database): Promise<BodyMeasurement[]> {
  return db.getAllAsync<BodyMeasurement>(
    'SELECT date, part, cm FROM body_measurements WHERE deleted_at IS NULL ORDER BY date, part',
    [],
  );
}

/**
 * Records the measurements of a day, the way a form hands them over: a number sets a body
 * part, `null` clears it, a part that is not mentioned is left as it is. To make all of it one
 * change, call this inside a transaction.
 */
export async function saveBodyMeasurements(
  db: Database,
  date: Day,
  values: Readonly<Record<string, number | null>>,
  now: number,
): Promise<void> {
  for (const [part, cm] of Object.entries(values)) {
    if (cm === null) {
      await db.runAsync(
        'UPDATE body_measurements SET deleted_at = ?, updated_at = ? WHERE date = ? AND part = ? AND deleted_at IS NULL',
        [now, now, date, part],
      );
    } else {
      await db.runAsync(
        `INSERT INTO body_measurements (date, part, cm, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (date, part) DO UPDATE SET cm = excluded.cm, updated_at = excluded.updated_at, deleted_at = NULL`,
        [date, part, cm, now],
      );
    }
  }
}
