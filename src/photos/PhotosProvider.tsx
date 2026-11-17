import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addPhotos, deletePhoto, listPhotos, newId, useDatabase } from '@/db';
import type { Day, ProgressPhoto } from '@/domain';

import { keepPhoto, removePhoto } from './files';
import { pickPhotos } from './pick';

export type Photos = {
  /** Newest day first. */
  photos: readonly ProgressPhoto[];
  /** Asks for pictures and adds them to the day. Resolves with how many were added; 0 when none were chosen. */
  addFromGallery(date: Day): Promise<number>;
  remove(id: string): Promise<void>;
};

const PhotosContext = createContext<Photos | null>(null);

/** The extension of a picked picture, from its address: `jpg` unless it says otherwise. */
function extensionOf(uri: string): string {
  const match = /\.([a-z0-9]{3,4})(?:[?#].*)?$/i.exec(uri);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

/** Progress photos for the body screen and the photo screens, read once and shared. */
export function PhotosProvider({ children }: { children: ReactNode }) {
  const db = useDatabase();
  const [photos, setPhotos] = useState<readonly ProgressPhoto[]>([]);

  const reload = useCallback(async () => setPhotos(await listPhotos(db)), [db]);

  useEffect(() => {
    let cancelled = false;
    listPhotos(db).then(
      (found) => {
        if (!cancelled) setPhotos(found);
      },
      (error: unknown) => console.warn('Could not read the progress photos', error),
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const value = useMemo<Photos>(
    () => ({
      photos,
      async addFromGallery(date) {
        const picked = await pickPhotos();
        if (picked.length === 0) return 0;

        const now = Date.now();
        const added: ProgressPhoto[] = picked.map((uri, index) => {
          const id = newId(now + index);
          return { id, date, file: `${id}.${extensionOf(uri)}`, createdAt: now + index };
        });

        // Pictures first: a row without its picture would show an empty frame. If copying fails
        // halfway, the copies made so far go, and nothing is added.
        try {
          for (const [index, photo] of added.entries()) await keepPhoto(picked[index] ?? '', photo.file);
          await db.withExclusiveTransactionAsync((transaction) => addPhotos(transaction, added, now));
        } catch (error) {
          for (const photo of added) removePhoto(photo.file);
          throw error;
        }

        await reload();
        return added.length;
      },
      async remove(id) {
        const gone = await deletePhoto(db, id, Date.now());
        if (gone) removePhoto(gone.file);
        await reload();
      },
    }),
    [db, photos, reload],
  );

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotos(): Photos {
  const photos = useContext(PhotosContext);
  if (!photos) throw new Error('usePhotos() needs a <PhotosProvider> above it');
  return photos;
}
