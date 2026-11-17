import { fireEvent, userEvent, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, saveBodyWeight, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, dayOf, PULLUPS, RUN } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

/** Starts the app on a database of its own. */
async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { user: userEvent.setup() };
}

/** Gives the chart a width, as the phone does once it has laid the screen out. */
async function layOut() {
  await fireEvent(screen.getByTestId('chart-plot'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 160 } } });
}

beforeEach(() => {
  jest.mocked(getLocales).mockReturnValue([{ languageCode: 'en', regionCode: 'GB' }] as unknown as ReturnType<typeof getLocales>);
});

describe('the progress chart of the journal', () => {
  const seed = (db: Connection) =>
    addEntries(
      db,
      [
        entry(PULLUPS, daysAgo(20), { reps: 10 }),
        entry(PULLUPS, daysAgo(10), { reps: 12 }),
        entry(PULLUPS, daysAgo(10), { reps: 9 }),
        entry(PULLUPS, daysAgo(5), { reps: 11 }),
        entry(RUN, daysAgo(4), { distanceM: 5000, durationMs: 1_500_000 }),
        entry(RUN, daysAgo(2), { distanceM: 5000, durationMs: 1_470_000 }),
      ],
      1,
    );

  it('opens on the discipline logged last and switches to another', async () => {
    const { user } = await startApp('/workouts', seed);

    expect(screen.getByRole('radio', { name: 'Run 5 km' })).toBeChecked();
    expect(screen.getByText('Best time of each day; higher is faster')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: /^Chart of Run 5 km, days with a result: 2\. From 25:00 \(.+\) to 24:30 \(.+\)\.$/ })).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Pull-ups' }));

    expect(screen.getByRole('radio', { name: 'Pull-ups' })).toBeChecked();
    expect(screen.getByText('Most reps in a day')).toBeOnTheScreen();
    // The best of the day with two results: 12, not 9.
    expect(screen.getByRole('image', { name: /^Chart of Pull-ups, days with a result: 3\. From 10 \(.+\) to 11 \(.+\)\.$/ })).toBeOnTheScreen();
  });

  it('draws its scale once it knows its width', async () => {
    const { user } = await startApp('/workouts', seed);
    await user.press(screen.getByRole('radio', { name: 'Pull-ups' }));
    await layOut();

    const chart = screen.getByRole('image', { name: /^Chart of Pull-ups/ });
    expect(within(chart).getByText('20')).toBeOnTheScreen();
    expect(within(chart).getByText('10')).toBeOnTheScreen();
    expect(within(chart).getByText('0')).toBeOnTheScreen();
  });

  it('waits for a second day', async () => {
    await startApp('/workouts', (db) => addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 10 }), entry(PULLUPS, daysAgo(1), { reps: 11 })], 1));

    expect(screen.getByText('The chart appears once there are results from at least two days.')).toBeOnTheScreen();
    expect(screen.queryByRole('image', { name: /^Chart of/ })).not.toBeOnTheScreen();
  });

  it('is not there before the first result', async () => {
    await startApp('/workouts');
    expect(screen.queryByText('Progress')).not.toBeOnTheScreen();
  });
});

describe('the weight chart', () => {
  it('shows every weigh-in in the chosen unit', async () => {
    await startApp('/body', async (db) => {
      await saveBodyWeight(db, { date: daysAgo(30), kg: 82 }, 1);
      await saveBodyWeight(db, { date: daysAgo(3), kg: 80.5 }, 1);
    });

    expect(screen.getByText('Every weigh-in, kg')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: /^Weight chart, weigh-ins: 2\. From 82 kg \(.+\) to 80\.5 kg \(.+\)\.$/ })).toBeOnTheScreen();

    await layOut();
    const chart = screen.getByRole('image', { name: /^Weight chart/ });
    // 80.5 to 82 kg: the scale falls on whole kilograms.
    expect(within(chart).getByText('82')).toBeOnTheScreen();
    expect(within(chart).getByText('81')).toBeOnTheScreen();
    expect(within(chart).getByText('80')).toBeOnTheScreen();
  });

  it('needs two weigh-ins', async () => {
    await startApp('/body', (db) => saveBodyWeight(db, { date: daysAgo(3), kg: 80.5 }, 1));
    expect(screen.queryByText('Weight trend')).not.toBeOnTheScreen();
  });
});
