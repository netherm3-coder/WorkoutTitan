import { addPhotos, deletePhoto, listPhotos } from '../photos';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  db = await openTestDatabase();
});

const photo = (id: string, date: string, createdAt: number) => ({ id, date, file: `${id}.jpg`, createdAt });

describe('progress photos', () => {
  it('start with none', async () => {
    expect(await listPhotos(db)).toEqual([]);
  });

  it('are listed newest day first, and the latest added first within a day', async () => {
    await addPhotos(db, [photo('a', '2026-01-01', 1), photo('b', '2026-03-01', 2), photo('c', '2026-01-01', 3)], 3);

    expect(await listPhotos(db)).toEqual([photo('b', '2026-03-01', 2), photo('c', '2026-01-01', 3), photo('a', '2026-01-01', 1)]);
  });

  it('are deleted one by one, handing back the photo so its picture can go', async () => {
    await addPhotos(db, [photo('a', '2026-01-01', 1), photo('b', '2026-01-02', 2)], 2);

    expect(await deletePhoto(db, 'a', 5)).toEqual(photo('a', '2026-01-01', 1));
    expect(await listPhotos(db)).toEqual([photo('b', '2026-01-02', 2)]);
    expect(await deletePhoto(db, 'a', 6)).toBeNull();
    expect(await deletePhoto(db, 'missing', 6)).toBeNull();
  });

  it('refuse a day that is not one', async () => {
    await expect(addPhotos(db, [photo('a', 'yesterday', 1)], 1)).rejects.toThrow();
  });
});
