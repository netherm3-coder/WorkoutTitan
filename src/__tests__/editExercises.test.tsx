import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, deleteExercise, listDeletedExercises, listExercises, saveExercise, setGoal, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf } from '@/domain';
import { entry } from '@/domain/__tests__/support';
import { toRouteParam } from '@/navigation';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

/** A plank as the converter brings it over from Record: a bare time, so "less is better". */
const PLANK = customExercise({ id: 'custom:планка', name: 'Планка', kind: 'duration' });
const STAIRS = customExercise({ id: 'own:stairs', name: 'Stairs', kind: 'count', unit: 'floors' });
const SWIM = customExercise({ id: 'own:swim', name: 'Swim', kind: 'distanceTime', distanceUnit: 'km' });

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  jest.mocked(openRecordDatabase).mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

/** Two planks: 2:00 a week ago, 3:00 yesterday. */
async function planks(db: Connection) {
  await saveExercise(db, PLANK, 1);
  await addEntries(db, [entry(PLANK, daysAgo(7), { durationMs: 120_000 }), entry(PLANK, daysAgo(1), { durationMs: 180_000 })], 1);
}

const edit = (exercise: { id: string }) => `/exercise/${toRouteParam(exercise.id)}`;

beforeEach(() => {
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
});

describe('an own exercise', () => {
  it('shows what it records and which way is better, and opens for editing', async () => {
    const { user } = await startApp('/exercises', planks);

    expect(screen.getByText('Time, less is better')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Change the exercise "Планка"' }));

    expect(await screen.findByRole('header', { name: 'Change exercise' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Name')).toHaveDisplayValue('Планка');
    expect(screen.getByRole('radio', { name: 'lower' })).toBeChecked();
    expect(screen.getByText(/This does not change: the exercise's entries are already stored this way/)).toBeOnTheScreen();
  });

  it('is renamed everywhere at once', async () => {
    const { db, user } = await startApp(edit(PLANK), planks);

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Elbow plank');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('header', { name: 'Your exercises' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Change the exercise "Elbow plank"' })).toBeOnTheScreen();
    expect(await listExercises(db)).toEqual([{ ...PLANK, name: 'Elbow plank' }]);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Workouts' }));
    expect((await screen.findAllByText('Elbow plank')).length).toBe(2);
    expect(screen.queryByText('Планка')).not.toBeOnTheScreen();
  });

  it('turns the record around when the direction is turned around', async () => {
    const { db, user } = await startApp('/', planks);

    // As brought over, the shorter plank holds the record.
    expect(screen.getByRole('button', { name: /^Планка, 2:00, Standing for 7 days/ })).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Settings' }));
    await user.press(await screen.findByRole('link', { name: 'Your exercises' }));
    await user.press(await screen.findByRole('button', { name: 'Change the exercise "Планка"' }));
    await user.press(await screen.findByRole('radio', { name: 'higher' }));
    expect(screen.getByText('The records and goals of this exercise will be judged by the new rule at once.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Time, more is better')).toBeOnTheScreen();
    expect((await listExercises(db))[0]?.better).toBe('higher');

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Home' }));
    expect(await screen.findByRole('button', { name: /^Планка, 3:00, Standing for 1 day/ })).toBeOnTheScreen();
  });

  it('keeps its goal when the direction changes', async () => {
    const { db, user } = await startApp(edit(PLANK), async (database) => {
      await planks(database);
      await setGoal(database, 'custom:планка', 240_000, 1);
    });

    await user.press(screen.getByRole('radio', { name: 'higher' }));
    await user.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('header', { name: 'Your exercises' });

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Home' }));
    // A 3:00 hold against a goal of 4:00, now that longer is better.
    expect(await screen.findByRole('button', { name: /^Планка, 3:00, .*Goal: 4:00, 75%$/ })).toBeOnTheScreen();
    expect((await listExercises(db))[0]?.better).toBe('higher');
  });

  it('changes the unit of a number, and the results show it', async () => {
    const { db, user } = await startApp(edit(STAIRS), async (database) => {
      await saveExercise(database, STAIRS, 1);
      await addEntries(database, [entry(STAIRS, daysAgo(1), { value: 12 })], 1);
    });

    expect(screen.queryByRole('radiogroup', { name: 'Distance in' })).not.toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Unit'));
    await user.type(screen.getByLabelText('Unit'), 'flights');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByRole('header', { name: 'Your exercises' });
    expect((await listExercises(db))[0]?.unit).toBe('flights');
    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Workouts' }));
    expect(await screen.findByText('12 flights')).toBeOnTheScreen();
  });

  it('switches a distance to metres', async () => {
    const { db, user } = await startApp(edit(SWIM), (database) => saveExercise(database, SWIM, 1));

    expect(screen.queryByRole('radio', { name: 'higher' })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Unit')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'metres' }));
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByRole('header', { name: 'Your exercises' });
    expect((await listExercises(db))[0]?.distanceUnit).toBe('m');
  });

  it('needs a name that is not taken, and keeps its own', async () => {
    const { db, user } = await startApp(edit(PLANK), async (database) => {
      await planks(database);
      await saveExercise(database, STAIRS, 1);
    });

    await user.clear(screen.getByLabelText('Name'));
    await user.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Give the exercise a name.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Name'), ' stairs ');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('There already is an exercise with this name.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Run');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('There already is an exercise with this name.')).toBeOnTheScreen();

    // Its own name, in other letters, is fine.
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'ПЛАНКА');
    await user.press(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('header', { name: 'Your exercises' });
    expect((await listExercises(db)).map((exercise) => exercise.name)).toEqual(['ПЛАНКА', 'Stairs']);
  });

  it('says so when the change cannot be saved, and stays open', async () => {
    const { db, user } = await startApp(edit(PLANK), planks);
    jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk full'));

    await user.press(screen.getByRole('radio', { name: 'higher' }));
    await user.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Could not save. Try again.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Change exercise' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it.each([
    ['one that was deleted', '/exercise/' + toRouteParam('custom:планка')],
    ['a built-in one', '/exercise/' + toRouteParam('pullups')],
    ['an address the app did not make', '/exercise/custom:планка'],
  ])('is not offered for editing when it is %s', async (_, url) => {
    await startApp(url, async (database) => {
      await planks(database);
      await deleteExercise(database, PLANK.id, 2);
    });

    expect(screen.getByText('This exercise no longer exists.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Name')).not.toBeOnTheScreen();
  });
});

describe('a deleted exercise', () => {
  it('is listed with the entries it took along, and comes back with them', async () => {
    const { db, user } = await startApp('/exercises', planks);
    expect(screen.queryByText('Deleted exercises')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Delete the exercise "Планка"' }));
    await user.press(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Deleted exercises')).toBeOnTheScreen();
    expect(screen.getByText('Time, less is better')).toBeOnTheScreen();
    expect(screen.getByText('Entries: 2')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Bring back the exercise "Планка"' }));

    expect(await screen.findByRole('button', { name: 'Change the exercise "Планка"' })).toBeOnTheScreen();
    expect(screen.queryByText('Deleted exercises')).not.toBeOnTheScreen();
    expect(await listDeletedExercises(db)).toEqual([]);

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('tab', { name: 'Workouts' }));
    expect((await screen.findAllByText('Планка')).length).toBe(2);
  });

  it('does not come back while another exercise has its name', async () => {
    const { db, user } = await startApp('/exercises', async (database) => {
      await planks(database);
      await deleteExercise(database, PLANK.id, 2);
      await saveExercise(database, customExercise({ id: 'own:new-plank', name: 'планка', kind: 'duration', better: 'higher' }), 3);
    });

    await user.press(screen.getByRole('button', { name: 'Bring back the exercise "Планка"' }));

    expect(await screen.findByText('There is already an exercise "Планка". Rename it to bring this one back.')).toBeOnTheScreen();
    expect(await listDeletedExercises(db)).toHaveLength(1);
  });
});
