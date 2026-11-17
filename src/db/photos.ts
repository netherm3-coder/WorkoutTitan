import type { ProgressPhoto } from '@/domain';

import type { Database } from './types';

type PhotoRow = { id: string; date: string; file: string; created_at: number };

const fromRow = (row: PhotoRow): ProgressPhoto => ({ id: row.id, date: row.date, file: row.file, createdAt: row.created_at });

/** The progress photos, newest day first. */
export async function listPhotos(db: Database): Promise<ProgressPhoto[]> {
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT id, date, file, created_at FROM progress_photos WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC, id DESC',
    [],
  );
  return rows.map(fromRow);
}

/** Adds photos whose pictures are already kept. To make it one change, call this inside a transaction. */
export async function addPhotos(db: Database, photos: readonly ProgressPhoto[], now: number): Promise<void> {
  for (const photo of photos) {
    await db.runAsync('INSERT INTO progress_photos (id, date, file, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      photo.id,
      photo.date,
      photo.file,
      photo.createdAt,
      now,
    ]);
  }
}

/** Marks a photo as deleted and hands it back, so that its picture can go too. `null` if there is no such photo. */
export async function deletePhoto(db: Database, id: string, now: number): Promise<ProgressPhoto | null> {
  const row = await db.getFirstAsync<PhotoRow>(
    'SELECT id, date, file, created_at FROM progress_photos WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
  if (!row) return null;

  await db.runAsync('UPDATE progress_photos SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
  return fromRow(row);
}
