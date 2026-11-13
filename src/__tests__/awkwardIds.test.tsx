import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, listEntries, listGoals, saveExercise, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf, PULLUPS } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

/*
 * Ids that come from outside the app: rows of Record's file are named after their text, own
 * exercises brought over from Record after their name, and a backup file can hold anything.
 * The router decodes parameters twice, so these used to reach their screens changed.
 */
const AWKWARD = [
  ['an escape that the router would decode', '%2F#1'],
  ['a row of Record’s file', 'csv:2026-03-01|Підтягування 2/3 #1?a=b&c|12 (+20%) 50%2F#1'],
  ['the characters of an address', "/?#[]@!$&'()*+,;=%25"],
];

const today = dayOf(new Date());

async function startApp(initialUrl: string, seed: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed(db);
  jest.mocked(openRecordDatabase).mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

beforeEach(() => {
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
});

describe.each(AWKWARD)('an id with %s', (_, id) => {
  it('opens its entry from the journal and saves a change to it', async () => {
    const { db, user } = await startApp('/workouts', (database) =>
      addEntries(database, [entry(PULLUPS, addDays(today, -1), { reps: 12 }, { id })], 1),
    );

    await user.press(await screen.findByRole('button', { name: /^Pull-ups, 12/ }));
    expect(await screen.findByRole('header', { name: 'Edit entry' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Reps')).toHaveDisplayValue('12');

    await user.clear(screen.getByLabelText('Reps'));
    await user.type(screen.getByLabelText('Reps'), '13');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: /^Pull-ups, 13/ })).toBeOnTheScreen();
    expect(await listEntries(db)).toEqual([expect.objectContaining({ id, reps: 13 })]);
  });

  it('opens the goal of its exercise from the pedestal', async () => {
    const exercise = customExercise({ id: `custom:${id}`, name: 'Stairs', kind: 'count' });
    const { db, user } = await startApp('/', async (database) => {
      await saveExercise(database, exercise, 1);
      await addEntries(database, [entry(exercise, addDays(today, -1), { value: 40 })], 1);
    });

    await user.press(screen.getByRole('button', { name: /^Stairs, 40/ }));
    expect(await screen.findByText('Best result: 40')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Result'), '50');
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByRole('button', { name: /^Stairs, 40, .*Goal: 50, 80%$/ })).toBeOnTheScreen();
    expect(await listGoals(db)).toEqual(new Map([[`custom:${id}`, 50]]));
  });
});

describe('an address that was not made by the app', () => {
  it('opens no entry', async () => {
    await startApp('/entry/plain-id', (database) =>
      addEntries(database, [entry(PULLUPS, today, { reps: 12 }, { id: 'plain-id' })], 1),
    );

    expect(screen.getByRole('header', { name: 'Edit entry' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Reps')).not.toBeOnTheScreen();
  });
});
