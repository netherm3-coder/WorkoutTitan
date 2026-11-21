import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { readBackup } from '@/backup';
import { pickTextFile, shareTextFile } from '@/backup/files';
import {
  addEntries,
  collectBackupData,
  listEntries,
  saveBodyWeight,
  saveExercise,
  saveLook,
  setGoal,
  type Connection,
} from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf, PULLUPS, RUN, SHUTTLE } from '@/domain';
import { entry, minutes, resetSequence } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
jest.mock('@/backup/files', () => ({ pickTextFile: jest.fn(), shareTextFile: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const share = jest.mocked(shareTextFile);
const pick = jest.mocked(pickTextFile);

const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);
const PLANK = customExercise({ id: 'own:plank', name: 'Планка', kind: 'duration', better: 'higher' });

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  const app = await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { app, db, user: userEvent.setup() };
}

/** A phone with a bit of everything on it. */
async function fill(db: Connection) {
  await saveExercise(db, PLANK, 1);
  await addEntries(
    db,
    [
      entry(PULLUPS, daysAgo(3), { reps: 12 }),
      entry(RUN, daysAgo(2), { distanceM: 3000, durationMs: minutes(12, 40) }),
      entry(PLANK, daysAgo(1), { durationMs: minutes(3) }),
    ],
    1,
  );
  await saveBodyWeight(db, { date: daysAgo(3), kg: 78.4 }, 1);
  await setGoal(db, 'pullups', 20, 1);
  await saveLook(db, { armour: 'brown' }, 1);
}

/** The text of the file the app handed to the share sheet. */
const sharedFile = () => {
  const [name, text, mimeType] = share.mock.calls[0] ?? [];
  return { name, text: text ?? '', mimeType };
};

/** A backup file made on another phone that holds what `fill` puts in. */
async function fileFromAnotherPhone(): Promise<string> {
  resetSequence();
  const other = await openTestDatabase();
  await fill(other);
  return JSON.stringify({
    format: 'record-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    ...(await collectBackupData(other)),
  });
}

beforeEach(() => {
  resetSequence();
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
  share.mockReset().mockResolvedValue(undefined);
  pick.mockReset().mockResolvedValue(null);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the backup screen', () => {
  it('is reached from settings', async () => {
    const { user } = await startApp('/settings');

    await user.press(screen.getByRole('link', { name: 'Backup' }));

    expect(await screen.findByRole('header', { name: 'Backup' })).toBeOnTheScreen();
  });
});

describe('saving a copy', () => {
  it('hands the share sheet a file named by the day, with everything in it', async () => {
    const { db, user } = await startApp('/backup', fill);

    await user.press(screen.getByRole('button', { name: 'Save a copy' }));

    expect(await screen.findByText(`The file record-backup-${today}.json is ready. Keep it somewhere that will not be lost with the phone.`)).toBeOnTheScreen();
    expect(share).toHaveBeenCalledTimes(1);
    expect(sharedFile()).toMatchObject({ name: `record-backup-${today}.json`, mimeType: 'application/json' });

    const reading = readBackup(sharedFile().text);
    expect(reading).toMatchObject({ ok: true, backup: await collectBackupData(db) });
    expect(reading.ok && reading.backup.entries).toHaveLength(3);
  });

  it('works on an empty phone too', async () => {
    const { user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Save a copy' }));

    await screen.findByText(/is ready/);
    expect(readBackup(sharedFile().text)).toMatchObject({ ok: true, backup: { entries: [], exercises: [] } });
  });

  it('says so when the file could not be made', async () => {
    share.mockRejectedValueOnce(new Error('no space left'));
    const { user } = await startApp('/backup', fill);

    await user.press(screen.getByRole('button', { name: 'Save a copy' }));

    expect(await screen.findByText('Could not save the file. Try again.')).toBeOnTheScreen();
    expect(screen.queryByText(/is ready/)).not.toBeOnTheScreen();
  });
});

describe('the table of entries', () => {
  it('hands the share sheet a CSV of every result, oldest first, with its numbers', async () => {
    const { user } = await startApp('/backup', async (db) => {
      await saveExercise(db, PLANK, 1);
      await addEntries(
        db,
        [
          entry(PULLUPS, daysAgo(3), { reps: 12, loadKg: 20 }, { note: 'heavy, but "clean"\nlast set' }),
          entry(SHUTTLE, daysAgo(2), { segments: 4, distanceM: 9, durationMs: 9800 }),
          entry(PLANK, daysAgo(1), { durationMs: minutes(3) }),
        ],
        1,
      );
    });

    await user.press(screen.getByRole('button', { name: 'Save the table' }));

    expect(await screen.findByText(`The table record-entries-${today}.csv is ready.`)).toBeOnTheScreen();
    expect(sharedFile()).toMatchObject({ name: `record-entries-${today}.csv`, mimeType: 'text/csv' });
    expect(sharedFile().text.split('\r\n')).toEqual([
      '\uFEFF"Date","Discipline","Result","Reps","Load, kg","Time, s","Distance, m","Number","Note","Video","Result page"',
      `"${daysAgo(3)}","Pull-ups","12 (+20 kg)","12","20","","","","heavy, but ""clean"" last set","",""`,
      // Bare times carry their hours, or a spreadsheet would read 3:00 as three hours.
      `"${daysAgo(2)}","Shuttle run 4×9 m","0:00:09.8","","","9.8","36","","","",""`,
      `"${daysAgo(1)}","Планка","0:03:00","","","180","","","","",""`,
      '',
    ]);
  });

  it('writes numbers with the decimal mark of the language', async () => {
    const locales = [{ languageCode: 'uk', regionCode: 'UA' }] as unknown as ReturnType<typeof getLocales>;
    jest.mocked(getLocales).mockReturnValue(locales);
    const { user } = await startApp('/backup', (db) =>
      addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 6, loadKg: 12.5 })], 1),
    );

    await user.press(screen.getByRole('button', { name: 'Зберегти таблицю' }));

    expect(await screen.findByText(`Таблиця record-entries-${today}.csv готова.`)).toBeOnTheScreen();
    expect(sharedFile().text.split('\r\n')[1]).toBe(`"${daysAgo(1)}","Підтягування","6 (+12,5 кг)","6","12,5","","","","","",""`);
  });

  it('is not offered before the first entry', async () => {
    await startApp('/backup');
    expect(screen.queryByRole('button', { name: 'Save the table' })).not.toBeOnTheScreen();
    expect(screen.getByText('No entries yet.')).toBeOnTheScreen();
  });

  it('says so when the table could not be made', async () => {
    share.mockRejectedValueOnce(new Error('no share sheet'));
    const { user } = await startApp('/backup', fill);

    await user.press(screen.getByRole('button', { name: 'Save the table' }));

    expect(await screen.findByText('Could not save the table. Try again.')).toBeOnTheScreen();
  });
});

describe('restoring from a file', () => {
  it('shows what is in the file and changes nothing until asked', async () => {
    pick.mockResolvedValueOnce({ name: 'record-backup-2026-11-13.json', text: await fileFromAnotherPhone() });
    const { db, user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('Copy "record-backup-2026-11-13.json"')).toBeOnTheScreen();
    expect(screen.getByText('Made: Today')).toBeOnTheScreen();
    expect(screen.getByText('Entries: 3')).toBeOnTheScreen();
    expect(screen.getByText('New to this phone: 3')).toBeOnTheScreen();
    expect(screen.getByText('Own exercises: 1')).toBeOnTheScreen();
    expect(screen.getByText('Weigh-ins: 1')).toBeOnTheScreen();
    expect(screen.getByText('Measurements: 0')).toBeOnTheScreen();
    expect(screen.getByText('Goals: 1')).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });

  it('adds the data once asked, and the rest of the app sees it at once', async () => {
    pick.mockResolvedValueOnce({ name: 'copy.json', text: await fileFromAnotherPhone() });
    const { db, user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Add the data from the file' }));

    expect(await screen.findByText('Done. Entries on the phone now: 3')).toBeOnTheScreen();
    expect(await collectBackupData(db)).toMatchObject({
      exercises: [PLANK],
      bodyWeights: [{ date: daysAgo(3), kg: 78.4 }],
      goals: [{ discipline: 'pullups', target: 20 }],
      look: { armour: 'brown' },
    });

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Workouts' }));
    expect(await screen.findByRole('button', { name: /^Планка, / })).toBeOnTheScreen();
  });

  it('counts only the entries the phone lacks as new', async () => {
    pick.mockResolvedValueOnce({ name: 'copy.json', text: await fileFromAnotherPhone() });
    resetSequence();
    const { db, user } = await startApp('/backup', async (database) => {
      // The same first entry as in the file, and one of this phone's own.
      await addEntries(database, [entry(PULLUPS, daysAgo(3), { reps: 12 })], 1);
      await addEntries(database, [entry(PULLUPS, today, { reps: 14 }, { id: 'mine' })], 1);
    });

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    expect(await screen.findByText('New to this phone: 2')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Add the data from the file' }));
    expect(await screen.findByText('Done. Entries on the phone now: 4')).toBeOnTheScreen();
    expect((await listEntries(db)).map((item) => item.id)).toContain('mine');
  });

  it('adds nothing when the person changes their mind', async () => {
    pick.mockResolvedValueOnce({ name: 'copy.json', text: await fileFromAnotherPhone() });
    const { db, user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Do not add' }));

    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeOnTheScreen();
    expect(screen.queryByText('Entries: 3')).not.toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });

  it('goes back to waiting when no file is chosen', async () => {
    const { user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByRole('button', { name: 'Choose a file' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it.each([
    ['a photo', 'JFIF binary', 'This file does not look like a Record backup.'],
    ['other data', '{"name":"something else"}', 'This is a data file, but not a Record backup.'],
    [
      'a copy from a newer app',
      '{"format":"record-backup","version":99,"exportedAt":"2030-01-01T00:00:00Z"}',
      'This copy was made by a newer version of the app. Update the app and try again.',
    ],
    [
      'a damaged copy',
      '{"format":"record-backup","version":1,"exportedAt":"2026-11-13T00:00:00Z","entries":[{"id":"a"}]}',
      'The file is damaged, so nothing was taken from it. Where it goes wrong: entries[0].exerciseId',
    ],
  ])('refuses %s and says why', async (_, text, message) => {
    pick.mockResolvedValueOnce({ name: 'file', text });
    const { db, user } = await startApp('/backup', fill);

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add the data from the file' })).not.toBeOnTheScreen();
    expect(await listEntries(db)).toHaveLength(3);
  });

  it('says so when the file cannot be read at all', async () => {
    pick.mockRejectedValueOnce(new Error('permission denied'));
    const { user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('Could not read the file.')).toBeOnTheScreen();
  });

  it('leaves the phone as it was when adding fails', async () => {
    pick.mockResolvedValueOnce({ name: 'copy.json', text: await fileFromAnotherPhone() });
    const { db, user } = await startApp('/backup');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    const add = await screen.findByRole('button', { name: 'Add the data from the file' });
    jest.spyOn(db, 'withExclusiveTransactionAsync').mockRejectedValueOnce(new Error('disk full'));
    await user.press(add);

    expect(await screen.findByText('Could not add the data. Nothing on the phone has changed.')).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });
});
