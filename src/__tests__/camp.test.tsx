import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, userEvent, waitFor, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import { addEntries, loadLook, saveExercise, saveLook, type Connection } from '@/db';
import { openTestDatabase } from '@/db/__tests__/testDatabase';
import { openRecordDatabase } from '@/db/open';
import { addDays, customExercise, dayOf, DEFAULT_LOOK, PULLUPS, type Slot } from '@/domain';
import { entry } from '@/domain/__tests__/support';
import { createPurchaseStore } from '@/purchases';
import { saveCachedPremium } from '@/purchases/premiumCache';
import { fakeStore, runningSubscription } from '@/purchases/__tests__/fakeStore';

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

/** One pull-up entry: the first step, which opens the brown armour, the sprout and the beanie. */
const firstEntry = (db: Connection) => addEntries(db, [entry(PULLUPS, daysAgo(1), { reps: 3 })], 1);

/** Entries in five exercises of the person's own, which opens the dotted pattern. */
async function fiveOwnExercises(db: Connection) {
  for (const index of [1, 2, 3, 4, 5]) {
    const exercise = customExercise({ id: `own:${index}`, name: `Own ${index}`, kind: 'count' });
    await saveExercise(db, exercise, 1);
    await addEntries(db, [entry(exercise, daysAgo(index), { value: index })], 1);
  }
}

/** The choices of one slot. */
const group = (slot: Slot) => within(screen.getByTestId(`look-${slot}`));
const layers = () => screen.getAllByTestId(/^scene-/).map((layer) => String(layer.props.testID).replace('scene-', ''));

beforeEach(async () => {
  await AsyncStorage.clear();
  const locales = [{ languageCode: 'en', regionCode: 'US' }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
  jest.mocked(createPurchaseStore).mockReturnValue(null);
});

describe('the camp on the home screen', () => {
  it('starts as WorkoutTitan drew it: no hat, no pattern', async () => {
    await startApp('/');

    expect(screen.getByRole('image', { name: 'A knight resting by the campfire at camp' })).toBeOnTheScreen();
    expect(layers()).toEqual(['sky', 'tent', 'knight', 'campfire']);
  });

  it('wears what was chosen', async () => {
    await startApp('/', async (db) => {
      await firstEntry(db);
      await saveLook(db, { hat: 'sprout' }, 1);
    });

    expect(layers()).toEqual(['sky', 'tent', 'knight', 'hat', 'campfire']);
  });

  it('does not wear what is not open, and keeps the choice for when it is', async () => {
    const { db } = await startApp('/', (database) => saveLook(database, { hat: 'crown', armour: 'pink' }, 1));

    expect(layers()).toEqual(['sky', 'tent', 'knight', 'campfire']);
    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, hat: 'crown', armour: 'pink' });
  });

  it('opens the wardrobe', async () => {
    const { user } = await startApp('/');

    await user.press(screen.getByRole('button', { name: 'Change how the camp looks' }));

    expect(await screen.findByRole('header', { name: 'Camp look' })).toBeOnTheScreen();
  });
});

describe('the wardrobe', () => {
  it('is reached from settings too', async () => {
    const { user } = await startApp('/settings');

    await user.press(screen.getByRole('link', { name: 'Camp look' }));

    expect(await screen.findByRole('header', { name: 'Camp look' })).toBeOnTheScreen();
  });

  it('starts with only the starting items open', async () => {
    await startApp('/camp');

    expect(screen.getByText('Items opened: 4 of 61')).toBeOnTheScreen();
    expect(group('armour').getByRole('radio', { name: 'grey' })).toBeChecked();
    expect(group('armour').getByRole('radio', { name: 'brown, locked' })).not.toBeChecked();
    expect(group('hat').getByRole('radio', { name: 'no hat' })).toBeChecked();
    expect(group('sky').getByRole('radio', { name: 'sunny' })).toBeChecked();
    expect(group('season').getByRole('radio', { name: 'bare trees' })).toBeChecked();
  });

  it('offers every item of the catalogue', async () => {
    await startApp('/camp');

    const sizes = (['armour', 'hat', 'tent', 'pattern', 'sky', 'season'] as const).map(
      (slot) => group(slot).getAllByRole('radio').length,
    );
    // With "no hat" and "no pattern" among them.
    expect(sizes).toEqual([12, 21, 13, 7, 5, 5]);
  });

  it('opens items as achievements are earned, and saves a choice at once', async () => {
    const { db, user } = await startApp('/camp', firstEntry);

    expect(screen.getByText('Items opened: 7 of 61')).toBeOnTheScreen();

    await user.press(group('armour').getByRole('radio', { name: 'brown' }));

    expect(await screen.findByText('Armour colour: brown')).toBeOnTheScreen();
    expect(group('armour').getByRole('radio', { name: 'brown' })).toBeChecked();
    expect(group('armour').getByRole('radio', { name: 'grey' })).not.toBeChecked();
    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, armour: 'brown' });
  });

  it('puts a hat on and takes it off again', async () => {
    const { db, user } = await startApp('/camp', firstEntry);

    await user.press(group('hat').getByRole('radio', { name: 'sprout' }));
    expect(await screen.findByText('Headwear: sprout')).toBeOnTheScreen();
    expect(layers()).toContain('hat');

    await user.press(group('hat').getByRole('radio', { name: 'no hat' }));
    expect(await screen.findByText('Headwear: no hat')).toBeOnTheScreen();
    expect(layers()).not.toContain('hat');
    expect(await loadLook(db)).toEqual(DEFAULT_LOOK);
  });

  it('says which achievement opens a locked item instead of choosing it', async () => {
    const { db, user } = await startApp('/camp', firstEntry);

    await user.press(group('hat').getByRole('radio', { name: 'cowboy hat, locked' }));

    expect(await screen.findByText('The achievement "50 pull-ups" opens it.')).toBeOnTheScreen();
    expect(screen.getByText('Headwear: cowboy hat')).toBeOnTheScreen();
    expect(screen.getByText('Headwear: no hat')).toBeOnTheScreen();
    expect(await loadLook(db)).toEqual(DEFAULT_LOOK);
  });

  it('stops explaining once something else is chosen', async () => {
    const { user } = await startApp('/camp', firstEntry);

    await user.press(group('hat').getByRole('radio', { name: 'cowboy hat, locked' }));
    expect(await screen.findByText('The achievement "50 pull-ups" opens it.')).toBeOnTheScreen();

    await user.press(group('hat').getByRole('radio', { name: 'beanie' }));
    expect(await screen.findByText('Headwear: beanie')).toBeOnTheScreen();
    expect(screen.queryByText('The achievement "50 pull-ups" opens it.')).not.toBeOnTheScreen();
  });

  it('quotes the number of points the last achievement asks for', async () => {
    const { user } = await startApp('/camp');

    await user.press(group('hat').getByRole('radio', { name: 'crown, locked' }));

    expect(await screen.findByText('The achievement "Relentless" opens it.')).toBeOnTheScreen();
    expect(screen.getByText('Earn 1300 achievement points')).toBeOnTheScreen();
  });

  it('shows the colours of a pattern only when there is a pattern', async () => {
    const { db, user } = await startApp('/camp', fiveOwnExercises);

    expect(screen.queryByTestId('look-patternColour')).not.toBeOnTheScreen();

    await user.press(group('pattern').getByRole('radio', { name: 'dots' }));
    expect(await screen.findByText('Pattern colour: red')).toBeOnTheScreen();
    expect(layers()).toEqual(['sky', 'tent', 'pattern', 'knight', 'campfire']);

    await user.press(group('patternColour').getByRole('radio', { name: 'blue' }));
    expect(await screen.findByText('Pattern colour: blue')).toBeOnTheScreen();
    expect(await loadLook(db)).toMatchObject({ pattern: 'dots', patternColour: 'blue' });

    await user.press(group('pattern').getByRole('radio', { name: 'no pattern' }));
    expect(await screen.findByText('Pattern: no pattern')).toBeOnTheScreen();
    expect(screen.queryByTestId('look-patternColour')).not.toBeOnTheScreen();
  });

  it('carries the choice back to the home screen', async () => {
    const { user } = await startApp('/', firstEntry);

    await user.press(screen.getByRole('button', { name: 'Change how the camp looks' }));
    await user.press(await screen.findByRole('radio', { name: 'sprout' }));
    await screen.findByText('Headwear: sprout');
    await user.press(screen.getByRole('button', { name: 'Back' }));

    expect(await screen.findByRole('header', { name: 'Room of Records' })).toBeOnTheScreen();
    expect(layers()).toEqual(['sky', 'tent', 'knight', 'hat', 'campfire']);
  });

  it('says so when a choice cannot be saved, and keeps the look as it was', async () => {
    const { db, user } = await startApp('/camp', firstEntry);
    jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk full'));

    await user.press(group('armour').getByRole('radio', { name: 'brown' }));

    expect(await screen.findByText('Could not save. Try again.')).toBeOnTheScreen();
    expect(screen.getByText('Armour colour: grey')).toBeOnTheScreen();
  });
});

describe('the premium set', () => {
  it('is locked without a subscription, and says why', async () => {
    const { db, user } = await startApp('/camp');

    await user.press(group('hat').getByRole('radio', { name: 'duck, locked' }));

    expect(await screen.findByText('Part of the premium set.')).toBeOnTheScreen();
    expect(await loadLook(db)).toEqual(DEFAULT_LOOK);

    await user.press(screen.getByRole('link', { name: 'The premium set' }));
    expect(await screen.findByRole('header', { name: 'Support the author' })).toBeOnTheScreen();
  });

  it('opens with a subscription', async () => {
    jest.mocked(createPurchaseStore).mockReturnValue(fakeStore({ ownedNow: { ok: true, purchases: [runningSubscription()] } }));
    const { db, user } = await startApp('/camp');

    expect(await screen.findByText('Items opened: 16 of 61')).toBeOnTheScreen();

    await user.press(group('hat').getByRole('radio', { name: 'duck' }));
    await user.press(group('sky').getByRole('radio', { name: 'sunset' }));

    expect(await screen.findByText('Sky: sunset')).toBeOnTheScreen();
    expect(await loadLook(db)).toEqual({ ...DEFAULT_LOOK, hat: 'duck', sky: 'sunset' });
  });

  it('comes off when the subscription ends and back on when it returns', async () => {
    // The app saw the subscription yesterday; today Google Play says it has ended.
    await saveCachedPremium(true, Date.now() - 24 * 60 * 60 * 1000);
    const store = fakeStore();
    jest.mocked(createPurchaseStore).mockReturnValue(store);
    const { db } = await startApp('/camp', (database) => saveLook(database, { hat: 'duck' }, 1));

    await waitFor(() => expect(layers()).not.toContain('hat'));
    expect(group('hat').getByRole('radio', { name: 'no hat' })).toBeChecked();
    expect(await loadLook(db)).toMatchObject({ hat: 'duck' });

    // Subscribed again on another phone, and back in the app.
    store.ownedNow = { ok: true, purchases: [runningSubscription()] };
    await act(async () => {
      for (const [, listener] of jest.mocked(AppState.addEventListener).mock.calls) listener('active');
    });
    expect(layers()).toContain('hat');
    expect(group('hat').getByRole('radio', { name: 'duck' })).toBeChecked();
  });

  it('is worn from the first frame when the store said yes last time', async () => {
    await saveCachedPremium(true, Date.now());
    await startApp('/', (database) => saveLook(database, { hat: 'duck' }, 1));

    expect(layers()).toContain('hat');
  });
});

describe('new items', () => {
  const SEEN = 'record.camp.seenItems';
  const title = /new items? for the camp/;

  /** The list of seen items as last written to the phone, or `null` when it was not written. */
  const savedSeen = (): unknown => {
    const writes = jest.mocked(AsyncStorage.setItem).mock.calls.filter(([key]) => key === SEEN);
    const last = writes.at(-1);
    return last ? JSON.parse(last[1]) : null;
  };

  beforeEach(() => {
    jest.mocked(AsyncStorage.setItem).mockClear();
  });

  it('are announced on the home screen and marked in the wardrobe until it is opened', async () => {
    // An install that has kept the list and seen nothing yet; the first pull-ups open three items.
    await AsyncStorage.setItem(SEEN, '[]');
    const { user } = await startApp('/', firstEntry);

    expect(screen.getByText('3 new items for the camp')).toBeOnTheScreen();
    expect(screen.getByText('armour colour "brown", headwear "sprout", headwear "beanie"')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Try on' }));
    expect(await screen.findByRole('header', { name: 'Camp look' })).toBeOnTheScreen();
    expect(group('armour').getByRole('radio', { name: 'brown, new' })).toBeOnTheScreen();
    expect(group('hat').getByRole('radio', { name: 'sprout, new' })).toBeOnTheScreen();
    expect(group('hat').getByRole('radio', { name: 'crown, locked' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByText(title)).toBeNull();
    await waitFor(() => expect(savedSeen()).toEqual(['armour:brown', 'hat:beanie', 'hat:sprout']));
  });

  it('can be hidden without opening the wardrobe', async () => {
    await AsyncStorage.setItem(SEEN, '[]');
    const { user } = await startApp('/', firstEntry);

    await user.press(screen.getByRole('button', { name: 'Hide' }));

    expect(screen.queryByText(title)).toBeNull();
    await waitFor(() => expect(savedSeen()).toEqual(['armour:brown', 'hat:beanie', 'hat:sprout']));
  });

  it('are not news when they were earned before the app kept a list', async () => {
    await startApp('/', firstEntry);

    expect(screen.queryByText(title)).toBeNull();
    await waitFor(() => expect(savedSeen()).toEqual(['armour:brown', 'hat:beanie', 'hat:sprout']));
  });

  it('are named three at a time, with the rest counted', async () => {
    await AsyncStorage.setItem(SEEN, '[]');
    await startApp('/', async (db) => {
      await firstEntry(db);
      await fiveOwnExercises(db);
    });

    const heading = screen.getByText(title);
    const total = Number(/^(\d+)/.exec(String(heading.props.children))?.[1]);
    expect(total).toBeGreaterThan(3);
    expect(screen.getByText(new RegExp(`^armour colour "brown", headwear "sprout", headwear "beanie" and ${total - 3} more$`))).toBeOnTheScreen();
  });

  it('do not include the premium set, which the support screen announces', async () => {
    await AsyncStorage.setItem(SEEN, '[]');
    jest.mocked(createPurchaseStore).mockReturnValue(fakeStore({ ownedNow: { ok: true, purchases: [runningSubscription()] } }));
    await startApp('/');

    await waitFor(() => expect(layers()).toEqual(['sky', 'tent', 'knight', 'campfire']));
    expect(screen.queryByText(title)).toBeNull();
  });

  it('are counted in Ukrainian too', async () => {
    const locales = [{ languageCode: 'uk', regionCode: 'UA' }] as unknown as ReturnType<typeof getLocales>;
    jest.mocked(getLocales).mockReturnValue(locales);
    await AsyncStorage.setItem(SEEN, '[]');
    await startApp('/', firstEntry);

    expect(screen.getByText('3 нові предмети для табору')).toBeOnTheScreen();
    expect(screen.getByText('колір броні «коричневий», головний убір «паросток», головний убір «в\'язана шапка»')).toBeOnTheScreen();
  });
});
