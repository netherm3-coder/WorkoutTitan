import { userEvent, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, listEntries, saveBodyWeight, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, dayOf, PULLUPS, RUN } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const today = dayOf(new Date());

const deviceLanguage = (languageCode: string, regionCode: string) => {
  const locales = [{ languageCode, regionCode }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
};

/** Starts the app on a database of its own and hands that database back. */
async function startApp(initialUrl = '/', seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  const app = await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { app, db, user: userEvent.setup() };
}

beforeEach(() => {
  deviceLanguage('en', 'US');
});

describe('logging a result', () => {
  it('goes from the form into the database, the journal and the pedestal', async () => {
    const { app, db, user } = await startApp('/');
    expect(screen.getByText('No records yet')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Log a result' }));
    expect(await screen.findByRole('header', { name: 'New result' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Pull-ups' })).toBeChecked();

    await user.type(screen.getByLabelText('Reps'), '12');
    await user.type(screen.getByLabelText('Extra weight, kg'), '7,5');
    await user.type(screen.getByLabelText('Note'), 'after the night shift');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    // Back on the home screen, where the result now stands on the pedestal.
    expect(await screen.findByLabelText('Pull-ups, 12 (+7.5 kg), Set today')).toBeOnTheScreen();
    expect(app.getPathname()).toBe('/');
    expect(screen.getByLabelText('Pull-ups: 12')).toBeOnTheScreen();
    expect(screen.queryByText('No records yet')).not.toBeOnTheScreen();

    expect(await listEntries(db)).toMatchObject([
      { exerciseId: 'pullups', date: today, reps: 12, loadKg: 7.5, durationMs: null, note: 'after the night shift' },
    ]);

    await user.press(screen.getByRole('tab', { name: 'Workouts' }));
    expect(await screen.findByRole('button', { name: 'Pull-ups, 12 (+7.5 kg), Personal best' })).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('after the night shift')).toBeOnTheScreen();
  });

  it('asks for what is missing and saves nothing until it is there', async () => {
    const { db, user } = await startApp('/entry/new');

    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter the number of reps.')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Reps'), 'many');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('"Reps" has to be a number.')).toBeOnTheScreen();
    expect(screen.queryByText('Enter the number of reps.')).not.toBeOnTheScreen();

    expect(await listEntries(db)).toEqual([]);
    expect(screen.getByRole('header', { name: 'New result' })).toBeOnTheScreen();
  });

  it('shows the fields of the exercise that is picked', async () => {
    const { db, user } = await startApp('/entry/new');

    await user.press(screen.getByRole('radio', { name: 'Run' }));

    expect(screen.queryByLabelText('Reps')).not.toBeOnTheScreen();
    await user.type(screen.getByLabelText('Distance, km'), '5');
    await user.type(screen.getByLabelText('Minutes'), '24');
    await user.type(screen.getByLabelText('Seconds'), '30');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Run 5 km, 24:30, Personal best' })).toBeOnTheScreen();
    expect(await listEntries(db)).toMatchObject([{ exerciseId: 'run', distanceM: 5000, durationMs: 1_470_000, reps: null }]);
  });

  it('logs for an earlier day, but not for a day that has not come', async () => {
    const { db, user } = await startApp('/entry/new');

    expect(screen.getByText('Today')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Previous day' }));
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled();

    await user.type(screen.getByLabelText('Reps'), '9');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    await screen.findByRole('button', { name: /Pull-ups, 9/ });
    expect(await listEntries(db)).toMatchObject([{ date: addDays(today, -1), reps: 9 }]);
  });

  it('starts from the exercise that was logged last', async () => {
    await startApp('/entry/new', (db) =>
      addEntries(db, [entry(PULLUPS, '2026-01-01', { reps: 10 }), entry(RUN, '2026-01-02', { distanceM: 3000, durationMs: 840_000 })], 1),
    );

    expect(screen.getByRole('radio', { name: 'Run' })).toBeChecked();
    expect(screen.getByLabelText('Distance, km')).toBeOnTheScreen();
  });
});

describe('the journal', () => {
  const seed = (db: Connection) =>
    addEntries(
      db,
      [
        entry(PULLUPS, '2026-01-05', { reps: 10 }, { id: 'first' }),
        entry(PULLUPS, '2026-01-06', { reps: 9 }, { id: 'weaker' }),
        entry(PULLUPS, '2026-01-07', { reps: 12, loadKg: 20, durationMs: 41_000 }, { id: 'best' }),
        entry(RUN, '2026-01-07', { distanceM: 5000, durationMs: 1_500_000 }, { id: 'run' }),
      ],
      1,
    );

  it('lists results newest first by day and marks the personal bests', async () => {
    await startApp('/workouts', seed);

    const rows = screen.getAllByRole('button', { name: /Pull-ups|Run/ }).map((row) => row.props.accessibilityLabel);
    expect(rows).toEqual([
      'Run 5 km, 25:00, Personal best',
      'Pull-ups, 12 (+20 kg) (0:41), Personal best',
      'Pull-ups, 9',
      'Pull-ups, 10, Personal best',
    ]);
    expect(screen.getByText('7 January')).toBeOnTheScreen();
    expect(screen.getByText('5 January')).toBeOnTheScreen();
  });

  it('opens a result for editing with its numbers filled in, and saves the change', async () => {
    const { db, user } = await startApp('/workouts', seed);

    await user.press(screen.getByRole('button', { name: 'Pull-ups, 12 (+20 kg) (0:41), Personal best' }));

    expect(await screen.findByRole('header', { name: 'Edit entry' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Reps')).toHaveDisplayValue('12');
    expect(screen.getByLabelText('Extra weight, kg')).toHaveDisplayValue('20');
    expect(screen.getByLabelText('Seconds')).toHaveDisplayValue('41');

    await user.clear(screen.getByLabelText('Reps'));
    await user.type(screen.getByLabelText('Reps'), '13');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: 'Pull-ups, 13 (+20 kg) (0:41), Personal best' })).toBeOnTheScreen();
    expect((await listEntries(db)).find((item) => item.id === 'best')).toMatchObject({ reps: 13, loadKg: 20, date: '2026-01-07' });
  });

  it('deletes a result and can bring it back', async () => {
    const { db, user } = await startApp('/workouts', seed);

    await user.press(screen.getByRole('button', { name: 'Pull-ups, 9' }));
    await user.press(await screen.findByRole('button', { name: 'Delete entry' }));

    expect(await screen.findByText('Entry deleted.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pull-ups, 9' })).not.toBeOnTheScreen();
    expect((await listEntries(db)).map((item) => item.id)).not.toContain('weaker');

    await user.press(screen.getByRole('button', { name: 'Bring back' }));

    expect(await screen.findByRole('button', { name: 'Pull-ups, 9' })).toBeOnTheScreen();
    expect(screen.queryByText('Entry deleted.')).not.toBeOnTheScreen();
    expect((await listEntries(db)).map((item) => item.id)).toContain('weaker');
  });

  it('hands the title to the next best result when the record is deleted', async () => {
    const { user } = await startApp('/workouts', seed);

    await user.press(screen.getByRole('button', { name: 'Pull-ups, 12 (+20 kg) (0:41), Personal best' }));
    await user.press(await screen.findByRole('button', { name: 'Delete entry' }));
    await screen.findByText('Entry deleted.');

    await user.press(screen.getByRole('tab', { name: 'Home' }));
    expect(await screen.findByLabelText(/^Pull-ups, 10, Standing for \d+ days$/)).toBeOnTheScreen();
  });
});

describe('the pedestal', () => {
  it('shows the best of every discipline with its one-rep max and the lifetime totals', async () => {
    await startApp('/', async (db) => {
      await saveBodyWeight(db, { date: '2026-01-01', kg: 80 }, 1);
      await addEntries(
        db,
        [
          entry(PULLUPS, addDays(today, -3), { reps: 12, loadKg: 20 }),
          entry(PULLUPS, addDays(today, -1), { reps: 8 }),
          entry(RUN, addDays(today, -2), { distanceM: 5000, durationMs: 1_470_000 }),
          entry(RUN, addDays(today, -1), { distanceM: 3000, durationMs: 840_000 }),
        ],
        1,
      );
    });

    const pedestal = screen.getAllByLabelText(/Standing for|Set today/).map((row) => row.props.accessibilityLabel);
    expect(pedestal).toEqual([
      'Pull-ups, 12 (+20 kg), Standing for 3 days',
      'Run 3 km, 14:00, Standing for 1 day',
      'Run 5 km, 24:30, Standing for 2 days',
    ]);
    expect(within(screen.getByLabelText('Pull-ups, 12 (+20 kg), Standing for 3 days')).getByText('1RM: +53.3 kg')).toBeOnTheScreen();

    expect(screen.getByLabelText('Pull-ups: 20')).toBeOnTheScreen();
    expect(screen.getByLabelText('Run: 8 km')).toBeOnTheScreen();
  });

  it('speaks Ukrainian with its own decimals, units and plural forms', async () => {
    deviceLanguage('uk', 'UA');
    await startApp('/', async (db) => {
      await addEntries(db, [entry(PULLUPS, addDays(today, -3), { reps: 12, loadKg: 7.5 })], 1);
    });

    expect(screen.getByLabelText('Підтягування, 12 (+7,5 кг), Тримається 3 дні')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Записати результат' })).toBeOnTheScreen();
  });
});
