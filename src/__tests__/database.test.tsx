import { act, userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, deleteEntry, DatabaseTooNewError, SCHEMA_VERSION, schemaVersion, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { PULLUPS } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);

const deviceLanguage = (languageCode: string, regionCode: string) => {
  const locales = [{ languageCode, regionCode }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
};

const startApp = (initialUrl = '/') => renderRouter('src/app', { initialUrl });

beforeEach(() => {
  open.mockClear();
  deviceLanguage('en', 'US');
});

describe('the database when the app starts', () => {
  it('is opened once, with the current layout, before the first screen', async () => {
    await startApp('/settings');

    expect(await screen.findByText('Entries on this phone: 0')).toBeOnTheScreen();
    expect(open).toHaveBeenCalledTimes(1);

    const db = await open.mock.results[0]?.value;
    expect(await schemaVersion(db)).toBe(SCHEMA_VERSION);
  });

  it('shows what is already stored on the phone', async () => {
    const db = await openTestDatabase();
    await addEntries(
      db,
      [
        entry(PULLUPS, '2026-11-10', { reps: 10 }, { id: 'a' }),
        entry(PULLUPS, '2026-11-11', { reps: 11 }, { id: 'b' }),
        entry(PULLUPS, '2026-11-12', { reps: 12 }, { id: 'c' }),
      ],
      1,
    );
    await deleteEntry(db, 'b', 2);
    open.mockResolvedValueOnce(db);

    await startApp('/settings');

    expect(await screen.findByText('Entries on this phone: 2')).toBeOnTheScreen();
  });
});

describe('when the data cannot be opened', () => {
  it('says so instead of showing the app, and starts once it can', async () => {
    const user = userEvent.setup();
    open.mockRejectedValueOnce(new Error('disk I/O error'));

    const app = await startApp();

    expect(await screen.findByRole('header', { name: 'Data did not open' })).toBeOnTheScreen();
    expect(screen.getByText(/has not changed anything in it/)).toBeOnTheScreen();
    expect(screen.getByText('Technical details: disk I/O error')).toBeOnTheScreen();
    expect(screen.queryByRole('tab')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('header', { name: 'Room of Records' })).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(open).toHaveBeenCalledTimes(2);
    expect(app.getPathname()).toBe('/');
  });

  it('keeps the message up while it tries again, and after another failure', async () => {
    const user = userEvent.setup();
    let finish: (outcome: Connection | Error) => void = () => undefined;
    const pending = () =>
      new Promise<Connection>((resolve, reject) => {
        finish = (outcome) => (outcome instanceof Error ? reject(outcome) : resolve(outcome));
      });
    open.mockRejectedValueOnce(new Error('first failure')).mockImplementationOnce(pending).mockImplementationOnce(pending);

    await startApp();
    await user.press(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('button', { name: 'Try again' })).toBeDisabled();
    expect(screen.getByRole('header', { name: 'Data did not open' })).toBeOnTheScreen();

    await act(async () => finish(new Error('second failure')));

    expect(await screen.findByText('Technical details: second failure')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();

    await user.press(screen.getByRole('button', { name: 'Try again' }));
    await act(async () => finish(await openTestDatabase()));

    expect(await screen.findByRole('header', { name: 'Room of Records' })).toBeOnTheScreen();
  });

  it('asks for an update when the data comes from a newer version of the app', async () => {
    open.mockRejectedValueOnce(new DatabaseTooNewError(SCHEMA_VERSION + 3, SCHEMA_VERSION));

    await startApp();

    expect(await screen.findByText(/Update the app to open it/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeOnTheScreen();
    expect(screen.queryByText(/Technical details/)).not.toBeOnTheScreen();
  });

  it("speaks the phone's language", async () => {
    deviceLanguage('uk', 'UA');
    open.mockRejectedValueOnce(new Error('disk I/O error'));

    await startApp();

    expect(await screen.findByRole('header', { name: 'Дані не відкрилися' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Спробувати ще раз' })).toBeOnTheScreen();
  });
});
