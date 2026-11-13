import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import {
  addEntries,
  listBodyMeasurements,
  listBodyWeights,
  listEntries,
  listGoals,
  loadProfile,
  saveBodyMeasurements,
  saveBodyWeight,
  saveProfile,
  setGoal,
  type Connection,
} from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, BENCH_PRESS, dayOf, PULLUPS } from '@/domain';
import { entry, resetSequence } from '@/domain/__tests__/support';
import { toRouteParam } from '@/navigation';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const POUND = 0.45359237;
const INCH = 2.54;
const today = dayOf(new Date());
const daysAgo = (count: number) => addDays(today, -count);

type Phone = { language?: 'en' | 'uk'; measurementSystem?: 'metric' | 'us' | 'uk' };

function phone({ language = 'en', measurementSystem }: Phone = {}) {
  const locale = { languageCode: language, regionCode: language === 'en' ? 'US' : 'UA', measurementSystem };
  jest.mocked(getLocales).mockReturnValue([locale] as unknown as ReturnType<typeof getLocales>);
}

async function startApp(initialUrl: string, seed?: (db: Connection) => Promise<void>) {
  const db = await openTestDatabase();
  await seed?.(db);
  jest.mocked(openRecordDatabase).mockResolvedValueOnce(db);

  await renderRouter('src/app', { initialUrl });
  await screen.findAllByRole('header');
  return { db, user: userEvent.setup() };
}

/** Starts in pounds and inches, as if chosen in the settings before. */
async function choosePounds() {
  await AsyncStorage.setItem('record.settings.weightUnit', 'lb');
  await AsyncStorage.setItem('record.settings.lengthUnit', 'in');
}

const bench = (loadKg: number, reps = 5, date = daysAgo(1)) => entry(BENCH_PRESS, date, { loadKg, reps });

beforeEach(async () => {
  resetSequence();
  await AsyncStorage.clear();
  phone();
});

describe('the units', () => {
  it('are metric on a phone that says nothing about its system', async () => {
    await startApp('/settings');

    expect(within(screen.getByLabelText('Weight')).getByRole('radio', { name: 'kg' })).toBeChecked();
    expect(within(screen.getByLabelText('Body measurements and height')).getByRole('radio', { name: 'cm' })).toBeChecked();
    expect(screen.getByText(/Distances are always in kilometres and metres/)).toBeOnTheScreen();
  });

  it('are pounds and inches on a phone set to the US system', async () => {
    phone({ measurementSystem: 'us' });
    await startApp('/workouts', (db) => addEntries(db, [bench(100)], 1));

    expect(await screen.findByRole('button', { name: /^Bench press, 220.5 lb × 5/ })).toBeOnTheScreen();
  });

  it('follow the choice saved before over what the phone says', async () => {
    phone({ measurementSystem: 'us' });
    await AsyncStorage.setItem('record.settings.weightUnit', 'kg');
    await startApp('/workouts', (db) => addEntries(db, [bench(100)], 1));

    expect(await screen.findByRole('button', { name: /^Bench press, 100 kg × 5/ })).toBeOnTheScreen();
  });

  it('switch every screen at once and are remembered', async () => {
    const { user } = await startApp('/settings', (db) => addEntries(db, [bench(100)], 1));

    await user.press(within(screen.getByLabelText('Weight')).getByRole('radio', { name: 'lb' }));

    expect(await AsyncStorage.getItem('record.settings.weightUnit')).toBe('lb');
    expect(await AsyncStorage.getItem('record.settings.lengthUnit')).toBeNull();
    await user.press(screen.getByRole('tab', { name: 'Workouts' }));
    expect(await screen.findByRole('button', { name: /^Bench press, 220.5 lb × 5/ })).toBeOnTheScreen();
    await user.press(screen.getByRole('tab', { name: 'Home' }));
    // Epley gives 116.7 kg for 100 kg × 5.
    expect(await screen.findByText('1RM: 257.3 lb')).toBeOnTheScreen();
  });
});

describe('in pounds', () => {
  beforeEach(choosePounds);

  it('takes a lift in pounds and keeps it in kilograms', async () => {
    const { db, user } = await startApp('/entry/new');

    await user.press(screen.getByRole('radio', { name: 'Bench press' }));
    await user.type(screen.getByLabelText('Weight, lb'), '225');
    await user.type(screen.getByLabelText('Reps'), '5');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: /^Bench press, 225 lb × 5/ })).toBeOnTheScreen();
    const [saved] = await listEntries(db);
    expect(saved?.loadKg).toBeCloseTo(225 * POUND, 10);
  });

  it('keeps a load exact when an entry is saved with the load untouched', async () => {
    const lift = bench(82.5);
    const { db, user } = await startApp(`/entry/${toRouteParam(lift.id)}`, (database) => addEntries(database, [lift], 1));

    expect(screen.getByLabelText('Weight, lb')).toHaveDisplayValue('181.9');
    await user.clear(screen.getByLabelText('Reps'));
    await user.type(screen.getByLabelText('Reps'), '6');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    await screen.findByRole('button', { name: /^Bench press, 181.9 lb × 6/ });
    expect(await listEntries(db)).toEqual([expect.objectContaining({ loadKg: 82.5, reps: 6 })]);
  });

  it('takes the extra weight of a pull-up in pounds', async () => {
    const { db, user } = await startApp('/entry/new');

    await user.type(screen.getByLabelText('Reps'), '10');
    await user.type(screen.getByLabelText('Extra weight, lb'), '45');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('button', { name: /^Pull-ups, 10 \(\+45 lb\)/ })).toBeOnTheScreen();
    expect((await listEntries(db))[0]?.loadKg).toBeCloseTo(45 * POUND, 10);
  });

  it('sets a goal for a lift in pounds', async () => {
    const { db, user } = await startApp(`/goal?discipline=${toRouteParam('benchPress')}`, (database) =>
      addEntries(database, [bench(100)], 1),
    );

    await user.type(screen.getByLabelText('Weight, lb'), '250');
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    expect(await screen.findByRole('button', { name: /^Bench press, 220.5 lb × 5, .*Goal: 250 lb, \d+%$/ })).toBeOnTheScreen();
    expect((await listGoals(db)).get('benchPress')).toBeCloseTo(250 * POUND, 10);
  });

  it('keeps a goal exact when it is saved untouched', async () => {
    const { db, user } = await startApp(`/goal?discipline=${toRouteParam('benchPress')}`, async (database) => {
      await addEntries(database, [bench(100)], 1);
      await setGoal(database, 'benchPress', 120, 1);
    });

    expect(screen.getByLabelText('Weight, lb')).toHaveDisplayValue('264.6');
    await user.press(screen.getByRole('button', { name: 'Save goal' }));

    await screen.findByRole('header', { name: 'Room of Records' });
    expect((await listGoals(db)).get('benchPress')).toBe(120);
  });

  it('weighs the body in pounds', async () => {
    const { db, user } = await startApp('/body', (database) => saveBodyWeight(database, { date: daysAgo(3), kg: 80 }, 1));

    expect(screen.getByLabelText('Weight: 176.4 lb')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Weight, lb'), '175');
    await user.press(screen.getByRole('button', { name: 'Record weight' }));

    expect(await screen.findByLabelText('Weight: 175 lb')).toBeOnTheScreen();
    expect(screen.getByText('−1.4 lb since the previous weigh-in')).toBeOnTheScreen();
    expect((await listBodyWeights(db)).at(-1)?.kg).toBeCloseTo(175 * POUND, 10);
  });

  it('names the bench achievements in pounds', async () => {
    await startApp('/achievements');

    expect(screen.getByText('Bench press 220.5 lb')).toBeOnTheScreen();
    expect(screen.getByText('Bench press 330.7 lb')).toBeOnTheScreen();
  });
});

describe('in inches', () => {
  beforeEach(choosePounds);

  it('shows the height in inches and keeps it exact when saved untouched', async () => {
    const { db, user } = await startApp('/body', (database) => saveProfile(database, { heightCm: 180 }, 1));

    expect(screen.getByLabelText('Height, in')).toHaveDisplayValue('70.9');
    await user.press(screen.getByRole('button', { name: 'Save height' }));
    expect((await loadProfile(db)).heightCm).toBe(180);

    await user.clear(screen.getByLabelText('Height, in'));
    await user.type(screen.getByLabelText('Height, in'), '71');
    await user.press(screen.getByRole('button', { name: 'Save height' }));
    await screen.findByLabelText('Height, in');
    expect((await loadProfile(db)).heightCm).toBeCloseTo(71 * INCH, 10);
  });

  it('takes measurements in inches and leaves the untouched ones as they were', async () => {
    const { db, user } = await startApp('/measurements', (database) =>
      saveBodyMeasurements(database, today, { waist: 81, neck: 38.5 }, 1),
    );

    expect(screen.getByText('In inches. An empty field means that body part was not measured.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Waist')).toHaveDisplayValue('31.9');
    await user.clear(screen.getByLabelText('Neck'));
    await user.type(screen.getByLabelText('Neck'), '15');
    await user.type(screen.getByLabelText('Chest'), '40');
    await user.press(screen.getByRole('button', { name: 'Save measurements' }));

    await screen.findByLabelText('Waist: 31.9 in');
    const saved = Object.fromEntries((await listBodyMeasurements(db)).map(({ part, cm }) => [part, cm]));
    expect(saved.waist).toBe(81);
    expect(saved.neck).toBeCloseTo(15 * INCH, 10);
    expect(saved.chest).toBeCloseTo(40 * INCH, 10);
  });
});

describe('in Ukrainian', () => {
  beforeEach(async () => {
    phone({ language: 'uk' });
    await choosePounds();
  });

  it('declines pounds and inches by the number', async () => {
    await startApp('/body', async (database) => {
      await saveBodyWeight(database, { date: daysAgo(1), kg: 180 * POUND }, 1);
      await saveBodyMeasurements(database, today, { waist: 32 * INCH, neck: 15.5 * INCH, chest: 41 * INCH }, 1);
    });

    expect(screen.getByLabelText('Вага: 180 фунтів')).toBeOnTheScreen();
    expect(screen.getByLabelText('Талія: 32 дюйми')).toBeOnTheScreen();
    expect(screen.getByLabelText('Шия: 15,5 дюйма')).toBeOnTheScreen();
    expect(screen.getByLabelText('Груди: 41 дюйм')).toBeOnTheScreen();
    expect(screen.getByLabelText('Вага, фунти')).toBeOnTheScreen();
  });
});

it('leaves the pull-up count alone in any unit', async () => {
  await choosePounds();
  await startApp('/workouts', (db) => addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 12 })], 1));

  expect(await screen.findByRole('button', { name: /^Pull-ups, 12/ })).toBeOnTheScreen();
});
