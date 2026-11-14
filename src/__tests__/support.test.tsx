import AsyncStorage from '@react-native-async-storage/async-storage';
import { userEvent, within } from '@testing-library/react-native';
import { getLocales } from 'expo-localization';
import { renderRouter, screen } from 'expo-router/testing-library';

import { createPurchaseStore } from '@/purchases';
import { fakeStore, purchaseOf, runningSubscription, type FakeStore } from '@/purchases/__tests__/fakeStore';

jest.mock('expo-localization', () => ({ getLocales: jest.fn() }));

const deviceLocale = (languageCode: string, regionCode: string) => {
  const locales = [{ languageCode, regionCode }] as unknown as ReturnType<typeof getLocales>;
  jest.mocked(getLocales).mockReturnValue(locales);
};

/** Opens the support screen in a build that sells through the given store, or through none. */
async function openSupport(store: FakeStore | null) {
  jest.mocked(createPurchaseStore).mockReturnValue(store);
  const app = await renderRouter('src/app', { initialUrl: '/support' });
  await screen.findAllByRole('header');
  return { app, user: userEvent.setup() };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });

beforeEach(async () => {
  await AsyncStorage.clear();
  deviceLocale('en', 'US');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the premium set', () => {
  it('is shown, item by item, before anyone pays for it', async () => {
    await openSupport(fakeStore());

    expect(screen.getByRole('image', { name: 'The camp in the items of the premium set' })).toBeOnTheScreen();
    expect(screen.getByText('12 items for the camp that open no other way:')).toBeOnTheScreen();
    for (const line of [
      'Armour colour: pink, purple',
      'Hat: top hat, headphones, cat ears, duck',
      'Tent colour: pink, purple',
      'Pattern: stars, hearts',
      'Sky: sunset',
      'Season: cherry blossom',
    ]) {
      expect(screen.getByText(line)).toBeOnTheScreen();
    }
    expect(screen.getByText('Everything else in the app is the same with it or without it.')).toBeOnTheScreen();
  });

  it('is offered at the price Google Play shows, with the terms', async () => {
    await openSupport(fakeStore());

    expect(await screen.findByText('$1.50 a month')).toBeOnTheScreen();
    expect(button('Subscribe')).toBeOnTheScreen();
    expect(screen.getByText(/renews every month until you cancel it/)).toBeOnTheScreen();
  });

  it('opens when paid for, and the subscription can be managed in Google Play', async () => {
    const store = fakeStore();
    const { user } = await openSupport(store);

    await user.press(await screen.findByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText('Premium is on. The new items are waiting in Camp look.')).toBeOnTheScreen();
    expect(screen.getByText('Your subscription is active. Thank you!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Subscribe/ })).toBeNull();

    await user.press(button('Manage subscription'));
    expect(store.managed).toBe(1);
  });

  it('shows as active from the start for a subscriber', async () => {
    await openSupport(fakeStore({ ownedNow: { ok: true, purchases: [runningSubscription()] } }));

    expect(await screen.findByText('Your subscription is active. Thank you!')).toBeOnTheScreen();
    expect(screen.queryByText(/Premium is on/)).toBeNull();
  });

  it('waits for a payment still on its way', async () => {
    const store = fakeStore({
      pay: (id, self) => {
        self.report(purchaseOf(id, { state: 'pending' }));
        return { ok: true };
      },
    });
    const { user } = await openSupport(store);

    await user.press(await screen.findByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByText(/The payment is still being processed/)).toBeOnTheScreen();
    expect(screen.queryByText('Your subscription is active. Thank you!')).toBeNull();
  });

  it('is not offered while Google Play does not sell it', async () => {
    await openSupport(fakeStore({ productsNow: [] }));

    expect(await screen.findByText('The subscription is not in Google Play yet.')).toBeOnTheScreen();
    expect(screen.getByText('Tips are not in Google Play yet.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Subscribe|Tip/ })).toBeNull();
  });
});

describe('tips', () => {
  it('come in three sizes at the prices of Google Play, and are thanked for', async () => {
    const store = fakeStore();
    const { user } = await openSupport(store);

    expect(await screen.findByRole('button', { name: 'Tip $0.99' })).toBeOnTheScreen();
    expect(button('Tip $4.99')).toBeOnTheScreen();
    await user.press(button('Tip $2.99'));

    expect(await screen.findByText('Thank you for the support!')).toBeOnTheScreen();
    expect(store.finished.map((purchase) => purchase.productId)).toEqual(['tip_medium']);
  });

  it('say nothing when the payment sheet is closed, and what went wrong otherwise', async () => {
    const store = fakeStore({ pay: () => ({ ok: false, problem: 'cancelled' }) });
    const { user } = await openSupport(store);

    await user.press(await screen.findByRole('button', { name: 'Tip $0.99' }));
    expect(screen.queryByRole('alert')).toBeNull();

    store.pay = () => ({ ok: false, problem: 'network' });
    await user.press(button('Tip $0.99'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/No connection to Google Play/);
  });
});

describe('restoring', () => {
  it('says when there is nothing to restore, and turns premium on when there is', async () => {
    const store = fakeStore();
    const { user } = await openSupport(store);

    await user.press(await screen.findByRole('button', { name: 'Restore purchases' }));
    expect(await screen.findByText('This Google account has no active subscription.')).toBeOnTheScreen();

    store.ownedNow = { ok: true, purchases: [runningSubscription()] };
    await user.press(button('Restore purchases'));
    expect(await screen.findByText('Subscription found; premium is on.')).toBeOnTheScreen();
    expect(screen.getByText('Your subscription is active. Thank you!')).toBeOnTheScreen();
  });
});

describe('without Google Play', () => {
  it('says that this build sells nothing, as in Expo Go', async () => {
    await openSupport(null);

    expect(screen.getByText(/This build sells nothing/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Subscribe|Tip|Restore/ })).toBeNull();
    // The set is still described, so there is something to look at.
    expect(screen.getByText('Hat: top hat, headphones, cat ears, duck')).toBeOnTheScreen();
  });

  it('lets a developer look at the premium set, without calling it a subscription', async () => {
    const { user } = await openSupport(null);

    await user.press(button('Show premium'));
    expect(button('Hide premium')).toBeOnTheScreen();
    expect(screen.queryByText('Your subscription is active. Thank you!')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    await user.press(await screen.findByRole('button', { name: 'Change how the camp looks' }));
    expect(await screen.findByText('Items opened: 16 of 61')).toBeOnTheScreen();
  });

  it('says when Google Play does not answer, and tries again', async () => {
    const store = fakeStore({ connects: false });
    const { user } = await openSupport(store);

    expect(await screen.findByText(/Google Play is not answering/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Subscribe/ })).toBeNull();

    store.connects = true;
    await user.press(button('Try again'));
    expect(await screen.findByRole('button', { name: 'Subscribe' })).toBeOnTheScreen();
    expect(screen.queryByText(/Google Play is not answering/)).toBeNull();
  });

  it('says it is connecting until Google Play answers', async () => {
    const store = fakeStore();
    store.connect = () => new Promise(() => {});
    await openSupport(store);

    expect(screen.getByText('Connecting to Google Play…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Subscribe|Tip|Restore/ })).toBeNull();
  });
});

describe('in Ukrainian', () => {
  it('counts the items and passes the price on as Google Play writes it', async () => {
    deviceLocale('uk', 'UA');
    await openSupport(fakeStore({ productsNow: [{ id: 'premium_monthly', price: '59,99 грн' }] }));

    expect(screen.getByText('12 предметів для табору, яких інакше не відкрити:')).toBeOnTheScreen();
    expect(await screen.findByText('59,99 грн на місяць')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Оформити підписку' })).toBeOnTheScreen();
    expect(screen.getByText('Шапка: циліндр, навушники, котячі вушка, качка')).toBeOnTheScreen();
    expect(within(screen.getByRole('button', { name: 'Відновити покупки' })).getByText('Відновити покупки')).toBeOnTheScreen();
  });
});
