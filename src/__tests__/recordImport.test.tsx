import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { writeRecordCsv } from '@/backup';
import { pickTextFile } from '@/backup/files';
import { addEntries, listEntries, listExercises, loadHistory, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { PULLUPS } from '@/domain';
import { makeRecordHistory } from '@/domain/__tests__/recordDataset';
import { entry, resetSequence } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));
jest.mock('@/backup/files', () => ({ pickTextFile: jest.fn(), shareTextFile: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const pick = jest.mocked(pickTextFile);

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  const app = await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { app, db, user: userEvent.setup() };
}

const FILE = writeRecordCsv([
  { date: '2026-03-05', exercise: 'Підтягування', count: 'багато' },
  { date: '2026-03-04', exercise: 'Жим лежачи', count: '100 кг' },
  { date: '2026-03-03', exercise: 'Планка', count: '3:30' },
  { date: '2026-03-02', exercise: 'Підтягування', count: '12 (+20 кг)' },
  { date: '2026-03-01', exercise: 'Планка', count: '3:00' },
  { date: '', exercise: 'Бруси', count: '20' },
]);

const choose = (text: string, name = 'Рекорди_2026-11-13.csv') => pick.mockResolvedValueOnce({ name, text });

beforeEach(() => {
  resetSequence();
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
  pick.mockReset().mockResolvedValue(null);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('bringing entries over from Record', () => {
  it('is reached from settings and says what to do in Record', async () => {
    const { user } = await startApp('/settings');

    await user.press(screen.getByRole('link', { name: 'Bring over from Record' }));

    expect(await screen.findByRole('header', { name: 'Bring over from Record' })).toBeOnTheScreen();
    expect(
      screen.getByText('In the old Record, open the menu and press "Експорт рекордів". It saves a file named like "Рекорди_2026-11-13.csv".'),
    ).toBeOnTheScreen();
  });

  it('shows what was found in the file and changes nothing until asked', async () => {
    choose(FILE);
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('File "Рекорди_2026-11-13.csv"')).toBeOnTheScreen();
    expect(screen.getByText('Rows with results: 6')).toBeOnTheScreen();
    expect(screen.getByText('New entries: 5')).toBeOnTheScreen();
    expect(screen.queryByText(/Brought over before/)).not.toBeOnTheScreen();
    expect(screen.getByText('New exercises of your own: 1')).toBeOnTheScreen();
    expect(screen.getByText('Планка: Time, less is better')).toBeOnTheScreen();
    expect(screen.getByText('The name and which way is better can be changed later in "Your exercises".')).toBeOnTheScreen();
    expect(screen.getByText('Will stay as text, because no numbers could be read: 1')).toBeOnTheScreen();
    expect(screen.getByText('For example, Підтягування: "багато"')).toBeOnTheScreen();
    expect(screen.getByText('A bench press with a weight only, taken as one rep: 1')).toBeOnTheScreen();
    expect(screen.queryByText(/A shuttle run without a scheme/)).not.toBeOnTheScreen();
    expect(screen.getByText('Will not be brought over, having no date or no result: 1')).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });

  it('brings the entries over once asked, and the rest of the app sees them', async () => {
    choose(FILE);
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Bring the entries over' }));

    expect(await screen.findByText('Done. Entries added: 5. On the phone now: 5')).toBeOnTheScreen();
    expect((await listExercises(db)).map((exercise) => exercise.name)).toEqual(['Планка']);
    expect((await loadHistory(db)).entries.map((item) => [item.date, item.exerciseId])).toEqual([
      ['2026-03-01', 'custom:планка'],
      ['2026-03-02', 'pullups'],
      ['2026-03-03', 'custom:планка'],
      ['2026-03-04', 'benchPress'],
      ['2026-03-05', 'pullups'],
    ]);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Workouts' }));
    expect((await screen.findAllByText('Планка')).length).toBeGreaterThan(0);
  });

  it('offers nothing to bring when the file was brought over before', async () => {
    choose(FILE);
    choose(FILE);
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Bring the entries over' }));
    await screen.findByText(/Done\./);
    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('Brought over before: 5')).toBeOnTheScreen();
    expect(screen.getByText('New entries: 0')).toBeOnTheScreen();
    expect(screen.getByText('The file has no new entries.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Bring the entries over' })).not.toBeOnTheScreen();
    expect(await listEntries(db)).toHaveLength(5);
  });

  it('leaves the entries made in the app alone', async () => {
    choose(FILE);
    const mine = entry(PULLUPS, '2026-04-01', { reps: 15 });
    const { db, user } = await startApp('/record-import', (database) => addEntries(database, [mine], 1));

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Bring the entries over' }));

    expect(await screen.findByText('Done. Entries added: 5. On the phone now: 6')).toBeOnTheScreen();
    expect(await listEntries(db)).toContainEqual(mine);
  });

  it('brings over a whole history of 400 rows', async () => {
    choose(writeRecordCsv(makeRecordHistory(2026, 400)));
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    expect(await screen.findByText('New entries: 400')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Bring the entries over' }));

    expect(await screen.findByText('Done. Entries added: 400. On the phone now: 400')).toBeOnTheScreen();
    expect(await listEntries(db)).toHaveLength(400);
  });

  it('adds nothing when the person changes their mind', async () => {
    choose(FILE);
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    await user.press(await screen.findByRole('button', { name: 'Do not bring over' }));

    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });

  it('counts the lines it could not make out and names them', async () => {
    choose(`${FILE}щось не те\n"2026-03-09","Бруси"\n`);
    const { user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('Lines that could not be made out: 2 (numbers: 8, 9)')).toBeOnTheScreen();
  });

  it.each([
    ['a backup of this app', '{"format":"record-backup","version":1}'],
    ['some other table', 'Name,Age\nAnna,30\n'],
  ])('refuses %s and says what it expects', async (_, text) => {
    choose(text, 'file');
    const { user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(
      await screen.findByText('This is not a file from "Експорт рекордів": its first line must be "Дата,Вправа,Результат".'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Bring the entries over' })).not.toBeOnTheScreen();
  });

  it('says so when the file cannot be read at all', async () => {
    pick.mockRejectedValueOnce(new Error('permission denied'));
    const { user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));

    expect(await screen.findByText('Could not read the file.')).toBeOnTheScreen();
  });

  it('leaves the phone as it was when bringing over fails', async () => {
    choose(FILE);
    const { db, user } = await startApp('/record-import');

    await user.press(screen.getByRole('button', { name: 'Choose a file' }));
    const bring = await screen.findByRole('button', { name: 'Bring the entries over' });
    jest.spyOn(db, 'withExclusiveTransactionAsync').mockRejectedValueOnce(new Error('disk full'));
    await user.press(bring);

    expect(await screen.findByText('Could not bring them over. Nothing on the phone has changed.')).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([]);
  });
});
