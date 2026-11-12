import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, listEntries, listExercises, listGoals, loadProfile, saveExercise, saveProfile, setGoal, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf, PULLUPS, RUN } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
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

beforeEach(() => {
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
});

describe('goals', () => {
  const pullups = (db: Connection) => addEntries(db, [entry(PULLUPS, daysAgo(2), { reps: 15 })], 1);
  const run = (db: Connection) => addEntries(db, [entry(RUN, daysAgo(2), { distanceM: 5000, durationMs: 1_500_000 })], 1);

  it('are set from the pedestal and show how far the best result is', async () => {
    const { db, user } = await startApp('/', pullups);

    await user.press(screen.getByRole('button', { name: 'Pull-ups, 15, Standing for 2 days' }));
    expect(await screen.findByRole('header', { name: 'Goal' })).toBeOnTheScreen();
    expect(screen.getByText('Pull-ups')).toBeOnTheScreen();
    expect(screen.getByText('Best result: 15')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Reps'), '20');
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByRole('button', { name: 'Pull-ups, 15, Standing for 2 days, Goal: 20, 75%' })).toBeOnTheScreen();
    expect(screen.getByText('Goal: 20')).toBeOnTheScreen();
    expect(await listGoals(db)).toEqual(new Map([['pullups', 20]]));
  });

  it('are a time for anything against the clock', async () => {
    const { db, user } = await startApp('/', run);

    await user.press(screen.getByRole('button', { name: 'Run 5 km, 25:00, Standing for 2 days' }));
    await user.type(await screen.findByLabelText('Minutes'), '20');
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    // 20:00 against a best of 25:00 is 80% of the way.
    expect(await screen.findByRole('button', { name: 'Run 5 km, 25:00, Standing for 2 days, Goal: 20:00, 80%' })).toBeOnTheScreen();
    expect(await listGoals(db)).toEqual(new Map([['run@5000', 1_200_000]]));
  });

  it.each(['', '0', 'more'])('are not saved as "%s"', async (typed) => {
    const { db, user } = await startApp('/goal?discipline=pullups', pullups);

    if (typed) await user.type(screen.getByLabelText('Reps'), typed);
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByText('Enter the goal as a number above zero.')).toBeOnTheScreen();
    expect(await listGoals(db)).toEqual(new Map());
  });

  it('open with the current goal filled in, and can be removed', async () => {
    const { db, user } = await startApp('/', async (database) => {
      await run(database);
      await setGoal(database, 'run@5000', 1_230_500, 1);
    });
    expect(screen.getByText('Goal: 20:30.5')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Run 5 km/ }));
    expect(await screen.findByText('Current goal: 20:30.5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Minutes')).toHaveDisplayValue('20');
    expect(screen.getByLabelText('Seconds')).toHaveDisplayValue('30.5');

    await user.press(screen.getByRole('button', { name: 'Remove goal' }));

    await screen.findByRole('header', { name: 'Room of Records' });
    expect(screen.queryByText(/Goal:/)).not.toBeOnTheScreen();
    expect(await listGoals(db)).toEqual(new Map());
  });

  it('say so when the discipline has no result', async () => {
    await startApp('/goal?discipline=run@42195');
    expect(screen.getByText('There is no result for this discipline yet.')).toBeOnTheScreen();
  });
});

describe('own exercises', () => {
  const PLANK = customExercise({ id: 'own:plank', name: 'Планка', kind: 'duration', better: 'higher' });

  it('are added with what they record, and can then be logged', async () => {
    const { db, user } = await startApp('/entry/new');

    await user.press(screen.getByRole('link', { name: 'Your exercises' }));
    expect(await screen.findByRole('header', { name: 'Your exercises' })).toBeOnTheScreen();
    expect(screen.getByText('No exercises of your own yet.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Name'), 'Plank');
    await user.press(screen.getByRole('radio', { name: 'Time' }));
    expect(screen.getByRole('radio', { name: 'lower' })).toBeChecked();
    await user.press(screen.getByRole('radio', { name: 'higher' }));
    await user.press(screen.getByRole('button', { name: 'Add exercise' }));

    expect(await screen.findByRole('button', { name: 'Delete the exercise "Plank"' })).toBeOnTheScreen();
    expect(await listExercises(db)).toMatchObject([{ name: 'Plank', kind: 'duration', better: 'higher', builtIn: false }]);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('radio', { name: 'Plank' }));
    await user.type(screen.getByLabelText('Minutes'), '3');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Plank, 3:00, Personal best' })).toBeOnTheScreen();
  });

  it('can be a number with a unit', async () => {
    const { db, user } = await startApp('/exercises');

    await user.type(screen.getByLabelText('Name'), 'Squat');
    await user.press(screen.getByRole('radio', { name: 'A number' }));
    await user.type(screen.getByLabelText('Unit'), 'kg');
    await user.press(screen.getByRole('button', { name: 'Add exercise' }));

    await screen.findByRole('button', { name: 'Delete the exercise "Squat"' });
    expect(await listExercises(db)).toMatchObject([{ name: 'Squat', kind: 'count', better: 'higher', unit: 'kg' }]);
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('');
  });

  it('need a name that is not taken, by a built-in exercise either', async () => {
    const { db, user } = await startApp('/exercises', (database) => saveExercise(database, PLANK, 1));

    await user.press(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByText('Give the exercise a name.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Name'), 'планка');
    await user.press(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByText('There already is an exercise with this name.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'pull-ups');
    await user.press(screen.getByRole('button', { name: 'Add exercise' }));
    expect(await screen.findByText('There already is an exercise with this name.')).toBeOnTheScreen();

    expect(await listExercises(db)).toHaveLength(1);
  });

  it('are deleted only after saying how many entries go with them', async () => {
    const { db, user } = await startApp('/exercises', async (database) => {
      await saveExercise(database, PLANK, 1);
      await addEntries(
        database,
        [entry(PLANK, daysAgo(2), { durationMs: 120_000 }), entry(PLANK, daysAgo(1), { durationMs: 150_000 }), entry(PULLUPS, daysAgo(1), { reps: 9 })],
        1,
      );
    });

    await user.press(screen.getByRole('button', { name: 'Delete the exercise "Планка"' }));
    expect(screen.getByText('Delete "Планка"? Its entries will leave the history: 2.')).toBeOnTheScreen();
    expect(await listExercises(db)).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Keep' }));
    expect(screen.queryByText(/Its entries will leave the history/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Delete the exercise "Планка"' }));
    await user.press(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('No exercises of your own yet.')).toBeOnTheScreen();
    expect(await listExercises(db)).toEqual([]);
    // The entries stay in the database, out of sight, in case the exercise comes back.
    expect(await listEntries(db)).toHaveLength(3);
  });

  it('say so when the one being deleted was never used', async () => {
    const { user } = await startApp('/exercises', async (database) => {
      await saveExercise(database, PLANK, 1);
    });

    await user.press(screen.getByRole('button', { name: 'Delete the exercise "Планка"' }));

    expect(screen.getByText('Delete "Планка"? It has no entries yet.')).toBeOnTheScreen();
  });
});

describe('counters', () => {
  it('take a start date and show the time since on the home screen', async () => {
    const { db, user } = await startApp('/settings');

    await user.press(screen.getByRole('link', { name: 'Counters' }));
    expect(await screen.findByRole('header', { name: 'Counters' })).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Training started: Day'), '21');
    await user.type(screen.getByLabelText('Training started: Month'), '1');
    await user.type(screen.getByLabelText('Training started: Year'), '2023');
    await user.press(screen.getByRole('button', { name: 'Training started: Save' }));

    expect(await screen.findByRole('button', { name: 'Training started: Turn off' })).toBeOnTheScreen();
    expect(await loadProfile(db)).toMatchObject({ trainingSince: '2023-01-21', soberSince: null });

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Home' }));
    expect(await screen.findByLabelText(/^Training experience: \d+ years/)).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Sobriety:/)).not.toBeOnTheScreen();
  });

  it.each([
    ['a day that does not exist', '31', '2', '2024'],
    ['a day that has not come', '1', '1', '2999'],
    ['words', 'first', '1', '2024'],
  ])('do not take %s', async (_label, day, month, year) => {
    const { db, user } = await startApp('/counters');

    await user.type(screen.getByLabelText('First sober day: Day'), day);
    await user.type(screen.getByLabelText('First sober day: Month'), month);
    await user.type(screen.getByLabelText('First sober day: Year'), year);
    await user.press(screen.getByRole('button', { name: 'First sober day: Save' }));

    expect(await screen.findByText('Enter a real date, not later than today.')).toBeOnTheScreen();
    expect(await loadProfile(db)).toMatchObject({ soberSince: null });
  });

  it('open with the dates that are set, and turning one off clears it', async () => {
    const { db, user } = await startApp('/counters', (database) => saveProfile(database, { soberSince: '2023-08-24' }, 1));

    expect(screen.getByLabelText('First sober day: Day')).toHaveDisplayValue('24');
    expect(screen.getByLabelText('First sober day: Month')).toHaveDisplayValue('8');
    expect(screen.getByLabelText('First sober day: Year')).toHaveDisplayValue('2023');

    await user.press(screen.getByRole('button', { name: 'First sober day: Turn off' }));

    expect(await screen.findByLabelText('First sober day: Day')).toHaveDisplayValue('');
    expect(screen.queryByRole('button', { name: 'First sober day: Turn off' })).not.toBeOnTheScreen();
    expect(await loadProfile(db)).toMatchObject({ soberSince: null });
  });

  it('show the time since on the home screen in months and days', async () => {
    await startApp('/', (database) => saveProfile(database, { soberSince: daysAgo(40) }, 1));

    // Forty days is a month and eight to twelve days, depending on the month.
    expect(screen.getByLabelText(/^Sobriety: 1 month \d+ days$/)).toBeOnTheScreen();
  });
});
