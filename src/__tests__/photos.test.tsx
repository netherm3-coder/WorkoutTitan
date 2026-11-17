import { fireEvent, userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addPhotos, listPhotos, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, dayOf } from '@/domain';
import { keepPhoto as keepPhotoFile, removePhoto as removePhotoFile } from '@/photos/files';
import { pickPhotos } from '@/photos/pick';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const pick = jest.mocked(pickPhotos);
const keepPhoto = jest.mocked(keepPhotoFile);
const removePhoto = jest.mocked(removePhotoFile);
/** The pictures the app has kept, in the stand-in of src/photos/__mocks__/files.ts. */
const { kept } = jest.requireMock<{ kept: Map<string, string> }>('@/photos/files');
const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  const app = await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { app, db, user: userEvent.setup() };
}

/** Gives the photo grids a width, as the phone does once it has laid the screen out. */
async function layOut() {
  for (const grid of screen.queryAllByTestId('photo-grid')) {
    await fireEvent(grid, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 312, height: 100 } } });
  }
}

/** Photos a week apart, newest first, with their pictures kept unless said otherwise. */
const seedPhotos =
  (count: number, { missing = [] as number[] } = {}) =>
  (db: Connection) => {
    const photos = Array.from({ length: count }, (_value, index) => ({
      id: `p${index}`,
      date: daysAgo(index * 7),
      file: `p${index}.jpg`,
      createdAt: index + 1,
    }));
    for (const [index, photo] of photos.entries()) {
      if (!missing.includes(index)) kept.set(photo.file, `file:///cache/${photo.file}`);
    }
    return addPhotos(db, photos, 1);
  };

beforeEach(() => {
  jest.mocked(getLocales).mockReturnValue([{ languageCode: 'en', regionCode: 'GB' }] as unknown as ReturnType<typeof getLocales>);
  kept.clear();
  keepPhoto.mockClear();
  removePhoto.mockClear();
});

describe('progress photos on the body screen', () => {
  it('invite the first photo and lead to the diary', async () => {
    const { app, user } = await startApp('/body');

    expect(screen.getByText('No photos yet.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Add the first photo' }));

    expect(await screen.findByRole('header', { name: 'Progress photos' })).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/photos');
    expect(screen.getByText('No photos yet')).toBeOnTheScreen();
  });

  it('show the latest three and count them all', async () => {
    await startApp('/body', seedPhotos(4));
    await layOut();

    expect(screen.getAllByRole('imagebutton', { name: /^Photo of / })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'All photos: 4' })).toBeOnTheScreen();
  });

  it('leave out photos whose pictures are not on the phone, as after Android restores its backup', async () => {
    const { db } = await startApp('/body', seedPhotos(3, { missing: [1] }));
    await layOut();

    expect(screen.getAllByRole('imagebutton', { name: /^Photo of / })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'All photos: 2' })).toBeOnTheScreen();
    expect(await listPhotos(db)).toHaveLength(3);
  });
});

describe('the photo diary', () => {
  it('adds the chosen pictures to the day, keeping copies of them', async () => {
    pick.mockResolvedValueOnce(['file:///cache/ImagePicker/front.jpeg', 'file:///cache/ImagePicker/side.png']);
    const { db, user } = await startApp('/photos');

    await user.press(screen.getByRole('button', { name: 'Previous day' }));
    await user.press(screen.getByRole('button', { name: 'Add photos from the gallery' }));

    await screen.findByTestId('photo-grid');
    const photos = await listPhotos(db);
    expect(photos.map(({ date }) => date)).toEqual([daysAgo(1), daysAgo(1)]);
    expect(photos.map(({ file }) => file.split('.').pop())).toEqual(['png', 'jpeg']);
    expect([...kept.entries()].sort()).toEqual(
      [
        [photos[1]?.file, 'file:///cache/ImagePicker/front.jpeg'],
        [photos[0]?.file, 'file:///cache/ImagePicker/side.png'],
      ].sort(),
    );

    await layOut();
    expect(screen.getAllByRole('imagebutton', { name: 'Photo of Yesterday' })).toHaveLength(2);
  });

  it('adds nothing when the picker is closed without a choice', async () => {
    const { db, user } = await startApp('/photos');

    await user.press(screen.getByRole('button', { name: 'Add photos from the gallery' }));

    expect(pick).toHaveBeenCalled();
    expect(await listPhotos(db)).toEqual([]);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('keeps nothing half done when a copy fails', async () => {
    pick.mockResolvedValueOnce(['file:///cache/a.jpg', 'file:///cache/b.jpg']);
    keepPhoto.mockImplementationOnce(async (source, name) => {
      kept.set(name, source);
    });
    keepPhoto.mockImplementationOnce(async () => {
      throw new Error('disk full');
    });
    jest.spyOn(console, 'warn').mockImplementationOnce(() => undefined);
    const { db, user } = await startApp('/photos');

    await user.press(screen.getByRole('button', { name: 'Add photos from the gallery' }));

    expect(await screen.findByText('Could not add the photos. Try again.')).toBeOnTheScreen();
    expect(await listPhotos(db)).toEqual([]);
    expect(kept.size).toBe(0);
  });

  it('opens a photo and deletes it with its copy, once asked twice', async () => {
    const { db, user } = await startApp('/photos', seedPhotos(2));
    await layOut();

    await user.press(screen.getByRole('imagebutton', { name: 'Photo of Today' }));
    expect(await screen.findByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Photo of Today')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Delete photo' }));
    expect(screen.getByText("Delete this photo? The app's copy is erased; the original in your gallery stays.")).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Keep it' }));
    expect(await listPhotos(db)).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: 'Delete photo' }));
    await user.press(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByRole('header', { name: 'Progress photos' })).toBeOnTheScreen();
    expect((await listPhotos(db)).map((photo) => photo.id)).toEqual(['p1']);
    expect(removePhoto).toHaveBeenCalledWith('p0.jpg');
  });

  it('says the backup does not carry the photos', async () => {
    await startApp('/backup');
    expect(screen.getByText(/Language, skin and progress photos stay on the phone\./)).toBeOnTheScreen();
  });
});
