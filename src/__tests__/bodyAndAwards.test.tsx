import { userEvent } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { addEntries, listBodyMeasurements, listBodyWeights, loadProfile, saveBodyMeasurements, saveBodyWeight, saveProfile, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, dayOf, PULLUPS } from '@/domain';
import { entry } from '@/domain/__tests__/support';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const open = jest.mocked(openRecordDatabase);
const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  open.mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

beforeEach(() => {
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
});

describe('body weight', () => {
  it('is recorded for today and shown at once', async () => {
    const { db, user } = await startApp('/body');
    expect(screen.getByText(/No weight yet/)).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Weight, kg'), '80,5');
    await user.press(screen.getByRole('button', { name: 'Record weight' }));

    expect(await screen.findByLabelText('Weight: 80.5 kg')).toBeOnTheScreen();
    expect(screen.getByLabelText('Weight, kg')).toHaveDisplayValue('');
    expect(await listBodyWeights(db)).toEqual([{ date: today, kg: 80.5 }]);
  });

  it.each(['', 'heavy', '0'])('is not recorded as "%s"', async (typed) => {
    const { db, user } = await startApp('/body');

    if (typed) await user.type(screen.getByLabelText('Weight, kg'), typed);
    await user.press(screen.getByRole('button', { name: 'Record weight' }));

    expect(await screen.findByText('Enter the weight as a number above zero.')).toBeOnTheScreen();
    expect(await listBodyWeights(db)).toEqual([]);
  });

  it('shows the change since the previous weigh-in and lets one be deleted', async () => {
    const { db, user } = await startApp('/body', async (database) => {
      await saveBodyWeight(database, { date: daysAgo(8), kg: 81 }, 1);
      await saveBodyWeight(database, { date: daysAgo(1), kg: 80.4 }, 2);
    });

    expect(screen.getByLabelText('Weight: 80.4 kg')).toBeOnTheScreen();
    expect(screen.getByText('−0.6 kg since the previous weigh-in')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Delete the weight of Yesterday' }));

    expect(await screen.findByLabelText('Weight: 81 kg')).toBeOnTheScreen();
    expect(await listBodyWeights(db)).toEqual([{ date: daysAgo(8), kg: 81 }]);
  });

  it('can be recorded for an earlier day', async () => {
    const { db, user } = await startApp('/body');

    await user.press(screen.getByRole('button', { name: 'Previous day' }));
    await user.type(screen.getByLabelText('Weight, kg'), '79');
    await user.press(screen.getByRole('button', { name: 'Record weight' }));

    await screen.findByLabelText('Weight: 79 kg');
    expect(await listBodyWeights(db)).toEqual([{ date: daysAgo(1), kg: 79 }]);
  });

  it('gives a body mass index once the height is known', async () => {
    const { db, user } = await startApp('/body', (database) => saveBodyWeight(database, { date: today, kg: 80 }, 1));
    expect(screen.queryByText(/Body mass index/)).not.toBeOnTheScreen();

    await user.type(screen.getByLabelText('Height, cm'), '180');
    await user.press(screen.getByRole('button', { name: 'Save height' }));

    expect(await screen.findByText('Body mass index: 24.7')).toBeOnTheScreen();
    expect(await loadProfile(db)).toMatchObject({ heightCm: 180 });
  });
});

describe('body measurements', () => {
  it('are entered on their own screen and listed with their latest values', async () => {
    const { db, user } = await startApp('/body');
    expect(screen.getByText('No measurements yet.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Record measurements' }));
    expect(await screen.findByRole('header', { name: 'Body measurements' })).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Waist'), '82');
    await user.type(screen.getByLabelText('Chest'), '104,5');
    await user.press(screen.getByRole('button', { name: 'Save measurements' }));

    expect(await screen.findByLabelText('Waist: 82 cm')).toBeOnTheScreen();
    expect(screen.getByLabelText('Chest: 104.5 cm')).toBeOnTheScreen();
    expect(await listBodyMeasurements(db)).toEqual([
      { date: today, part: 'chest', cm: 104.5 },
      { date: today, part: 'waist', cm: 82 },
    ]);
  });

  it('open filled in for a day that was already measured, and an emptied field clears its value', async () => {
    const { db, user } = await startApp('/measurements', (database) =>
      saveBodyMeasurements(database, today, { waist: 82, neck: 39 }, 1),
    );

    expect(screen.getByLabelText('Waist')).toHaveDisplayValue('82');
    expect(screen.getByLabelText('Neck')).toHaveDisplayValue('39');
    expect(screen.getByLabelText('Chest')).toHaveDisplayValue('');

    await user.clear(screen.getByLabelText('Neck'));
    await user.clear(screen.getByLabelText('Waist'));
    await user.type(screen.getByLabelText('Waist'), '81');
    await user.press(screen.getByRole('button', { name: 'Save measurements' }));

    await screen.findByRole('header', { name: 'Body' });
    expect(await listBodyMeasurements(db)).toEqual([{ date: today, part: 'waist', cm: 81 }]);
  });

  it('say which field is not a measurement and save nothing', async () => {
    const { db, user } = await startApp('/measurements');

    await user.type(screen.getByLabelText('Waist'), '82');
    await user.type(screen.getByLabelText('Calf'), 'big');
    await user.press(screen.getByRole('button', { name: 'Save measurements' }));

    expect(await screen.findByText('"Calf" has to be a number above zero.')).toBeOnTheScreen();
    expect(await listBodyMeasurements(db)).toEqual([]);
  });
});

describe('the sport status on the home screen', () => {
  const pullups = (date: string) => (db: Connection) => addEntries(db, [entry(PULLUPS, date, { reps: 10 })], 1);

  it('asks for a body weight first', async () => {
    await startApp('/', pullups(daysAgo(3)));
    expect(screen.getByText(/Record your weight on the Body tab/)).toBeOnTheScreen();
  });

  it('asks for a recent pull-up set when the last one is older than 90 days', async () => {
    await startApp('/', async (db) => {
      await pullups(daysAgo(120))(db);
      await saveBodyWeight(db, { date: daysAgo(200), kg: 80 }, 1);
    });
    expect(screen.getByText(/pull-ups of the last 90 days/)).toBeOnTheScreen();
  });

  it('shows the level, how far the next one is, and the set it comes from', async () => {
    await startApp('/', async (db) => {
      await pullups(daysAgo(1))(db);
      await saveBodyWeight(db, { date: daysAgo(30), kg: 80 }, 1);
    });

    // 10 reps at 80 kg: a coefficient of 1.33, which is "Athlete"; 1.5 is 14 kg away.
    expect(screen.getByLabelText('Sport status: Athlete')).toBeOnTheScreen();
    expect(screen.getByText('Coefficient 1.33')).toBeOnTheScreen();
    expect(screen.getByText('14 kg to go to "Master candidate"')).toBeOnTheScreen();
    expect(screen.getByText('Strongest set: 10')).toBeOnTheScreen();
    expect(screen.getByText('Yesterday')).toBeOnTheScreen();
  });
});

describe('achievements', () => {
  it('start locked, with the points on offer', async () => {
    await startApp('/achievements');

    expect(screen.getByText('Points: 0 of 2170')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('First step, Your first entry, Opens in the camp: armour colour "brown", headwear "sprout", not yet'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Relentless, Earn 1300 achievement points, Opens in the camp: headwear "crown", not yet')).toBeOnTheScreen();
    expect(screen.getByText('Opens in the camp: headwear "crown"')).toBeOnTheScreen();
    expect(screen.queryByText('Sobriety')).not.toBeOnTheScreen();
  });

  it('are earned from what is logged', async () => {
    await startApp('/achievements', (db) => addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 7 })], 1));

    expect(screen.getByText('Points: 15 of 2170')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('First step, Your first entry, Opens in the camp: armour colour "brown", headwear "sprout", earned'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('First pull-up, Your first pull-up entry, Opens in the camp: headwear "beanie", earned')).toBeOnTheScreen();
    expect(screen.getByLabelText('10 pull-ups, 10 reps in one set, Opens in the camp: tent colour "blue", not yet')).toBeOnTheScreen();
    expect(screen.getByLabelText('70% done')).toBeOnTheScreen();
  });

  it('include the sobriety ones once the counter has a first day', async () => {
    await startApp('/achievements', (db) => saveProfile(db, { soberSince: daysAgo(10) }, 1));

    expect(screen.getByText('Points: 15 of 2490')).toBeOnTheScreen();
    // The sobriety counter opens nothing for the camp, so its achievements name no reward.
    expect(screen.getByLabelText('7 days sober, A week without alcohol, earned')).toBeOnTheScreen();
    expect(screen.getByLabelText('Relentless, Earn 1500 achievement points, Opens in the camp: headwear "crown", not yet')).toBeOnTheScreen();
  });
});
