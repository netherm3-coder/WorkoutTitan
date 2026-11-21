import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, saveBodyWeight, saveExercise, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf, PULLUPS, RUN } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

const STRETCHING = customExercise({ id: 'custom:stretching', name: 'Stretching', kind: 'text' });

/** Starts the app on a database of its own. */
async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

/** The rows of the journal, by what a screen reader says of them. */
const rows = (name: RegExp = /^(Pull-ups|Run 5 km|Stretching), /) => screen.queryAllByRole('button', { name });

beforeEach(() => {
  jest.mocked(getLocales).mockReturnValue([{ languageCode: 'en', regionCode: 'GB' }] as unknown as ReturnType<typeof getLocales>);
});

describe('the filter of the journal', () => {
  const seed = async (db: Connection) => {
    await saveExercise(db, STRETCHING, 1);
    await addEntries(
      db,
      [
        entry(STRETCHING, daysAgo(4), { text: 'Easy' }),
        entry(PULLUPS, daysAgo(3), { reps: 10 }),
        entry(RUN, daysAgo(2), { distanceM: 5000, durationMs: 1_500_000 }),
        entry(PULLUPS, daysAgo(1), { reps: 12 }),
      ],
      1,
    );
  };

  it('lists every entry until a discipline is chosen, then only that one', async () => {
    const { user } = await startApp('/workouts', seed);
    expect(rows()).toHaveLength(4);

    await user.press(screen.getByRole('radio', { name: 'Pull-ups' }));

    expect(rows()).toHaveLength(2);
    expect(rows(/^Pull-ups, /)).toHaveLength(2);
    expect(screen.getByRole('image', { name: /^Chart of Pull-ups/ })).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'All' }));

    expect(rows()).toHaveLength(4);
    expect(screen.queryByRole('image', { name: /^Chart of/ })).not.toBeOnTheScreen();
  });

  it('lists the entries of a text result, which has no chart', async () => {
    const { user } = await startApp('/workouts', seed);

    await user.press(screen.getByRole('radio', { name: 'Stretching' }));

    expect(screen.getByText('Text results have no chart.')).toBeOnTheScreen();
    expect(rows()).toHaveLength(1);
    expect(rows(/^Stretching, Easy/)).toHaveLength(1);
  });

  it('shows everything again once the last entry of the chosen discipline is deleted', async () => {
    const { user } = await startApp('/workouts', seed);
    await user.press(screen.getByRole('radio', { name: 'Run 5 km' }));
    expect(rows()).toHaveLength(1);

    await user.press(rows(/^Run 5 km, /)[0]!);
    await user.press(await screen.findByRole('button', { name: 'Delete entry' }));

    expect(await screen.findByText('Entry deleted.')).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Run 5 km' })).not.toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    expect(rows()).toHaveLength(3);
  });
});

describe('the one-rep max of a set', () => {
  const weighed = (db: Connection) => saveBodyWeight(db, { date: daysAgo(10), kg: 80 }, 1);

  it('stands beside a set in the journal, with the body weight of its day', async () => {
    await startApp('/workouts', async (db) => {
      await weighed(db);
      // (80 + 10) x (1 + 8 / 30) - 80 = 34
      await addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 8, loadKg: 10 })], 1);
    });

    expect(screen.getByText('1RM: +34 kg')).toBeOnTheScreen();
    expect(rows(/^Pull-ups, .*, 1RM: \+34 kg, Personal best$/)).toHaveLength(1);
  });

  it('is not guessed before the first weigh-in', async () => {
    await startApp('/workouts', (db) => addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 8, loadKg: 10 })], 1));
    expect(screen.queryByText(/^1RM/)).not.toBeOnTheScreen();
  });

  it('is worked out in the form as the set is typed', async () => {
    const { user } = await startApp('/entry/new', weighed);
    expect(screen.getByRole('radio', { name: 'Pull-ups' })).toBeChecked();
    expect(screen.queryByText(/^Estimated one-rep max/)).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Reps'), '8');
    expect(screen.getByText('Estimated one-rep max (1RM): +21.3 kg')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Extra weight, kg'), '10');
    expect(screen.getByText('Estimated one-rep max (1RM): +34 kg')).toBeOnTheScreen();

    // A number that does not read gives no estimate rather than a wrong one.
    await user.type(screen.getByLabelText('Extra weight, kg'), 'x');
    expect(screen.queryByText(/^Estimated one-rep max/)).not.toBeOnTheScreen();
  });

  it('is the whole weight for the bench press, with no body weight needed', async () => {
    const { user } = await startApp('/entry/new');
    await user.press(screen.getByRole('radio', { name: 'Bench press' }));

    await user.type(screen.getByLabelText('Weight, kg'), '90');
    await user.type(screen.getByLabelText('Reps'), '5');

    expect(screen.getByText('Estimated one-rep max (1RM): 105 kg')).toBeOnTheScreen();
  });
});
