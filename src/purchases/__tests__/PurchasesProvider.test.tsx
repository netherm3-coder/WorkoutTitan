import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { PREMIUM_ID } from '../catalog';
import { loadCachedPremium } from '../premiumCache';
import { PurchasesProvider, usePremium, usePurchases, type Purchases } from '../PurchasesProvider';
import type { Owned, StorePurchase } from '../store';
import { fakeStore, purchaseOf, runningSubscription, type FakeStore } from './fakeStore';

let latest: { current: Purchases } = { current: null as unknown as Purchases };

/** What the app sees of the purchases right now. */
const seen = () => latest.current;

async function start(store: FakeStore | null, initialPremium = false) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PurchasesProvider initialPremium={initialPremium} store={store}>
      {children}
    </PurchasesProvider>
  );
  const view = await renderHook(() => usePurchases(), { wrapper });
  latest = view.result;
  return view;
}

async function startReady(store: FakeStore, initialPremium = false) {
  const view = await start(store, initialPremium);
  await waitFor(() => expect(seen().status).toBe('ready'));
  return view;
}

/** Keeps the store connecting until the returned function is called. */
function holdConnecting(store: FakeStore): () => Promise<void> {
  const connect = store.connect;
  let release: () => void = () => {};
  store.connect = (events) =>
    new Promise((resolve) => {
      release = () => resolve(connect(events));
    });
  return () => act(async () => release());
}

/** The app coming back to the front, as Android reports it. */
async function backToFront() {
  const listeners = jest.mocked(AppState.addEventListener).mock.calls.map(([, listener]) => listener);
  await act(async () => {
    for (const listener of listeners) listener('active');
  });
}

const owning = (...purchases: StorePurchase[]): Owned => ({ ok: true, purchases });

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(AppState.addEventListener).mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('a build without a store', () => {
  it('sells nothing and asks nothing', async () => {
    await start(null);
    expect(seen()).toMatchObject({ status: 'none', premium: false, products: [], busy: null, notice: null });

    await act(() => seen().buy(PREMIUM_ID));
    await act(() => seen().restore());
    expect(seen().notice).toBeNull();
  });

  it('can show the premium set while developing, until the app restarts', async () => {
    await start(null);
    expect(seen().preview).toEqual({ on: false, set: expect.any(Function) });

    await act(() => seen().preview?.set(true));
    expect(seen().premium).toBe(true);
    await expect(loadCachedPremium(Date.now())).resolves.toBe(false);
  });
});

describe('starting the app', () => {
  it('connects, lists the products and asks what the person owns', async () => {
    const store = fakeStore({ ownedNow: owning(runningSubscription()) });
    await startReady(store);

    expect(store.connections).toBe(1);
    expect(seen().premium).toBe(true);
    expect(seen().products.map((product) => product.id)).toEqual(['premium_monthly', 'tip_small', 'tip_medium', 'tip_large']);
    expect(seen().notice).toBeNull();
    expect(seen().preview).toBeNull();
    await expect(loadCachedPremium(Date.now())).resolves.toBe(true);
  });

  it('keeps the saved answer until the store gives its own', async () => {
    const store = fakeStore();
    const connect = holdConnecting(store);
    await start(store, true);
    expect(seen().status).toBe('connecting');
    expect(seen().premium).toBe(true);

    await connect();
    await waitFor(() => expect(seen().status).toBe('ready'));
    expect(seen().premium).toBe(false);
    await expect(loadCachedPremium(Date.now())).resolves.toBe(false);
  });

  it('keeps the saved answer when the store does not answer, and tries again when asked', async () => {
    const store = fakeStore({ connects: false, ownedNow: owning() });
    await start(store, true);
    await waitFor(() => expect(seen().status).toBe('failed'));
    expect(seen().premium).toBe(true);

    store.connects = true;
    const connect = holdConnecting(store);
    await act(() => seen().retry());
    expect(seen().status).toBe('connecting');
    await connect();
    await waitFor(() => expect(seen().status).toBe('ready'));
    expect(seen().premium).toBe(false);
    expect(store.connections).toBe(2);
  });

  it('closes the failed connection before it opens the new one', async () => {
    const store = fakeStore({ connects: false });
    await start(store);
    await waitFor(() => expect(seen().status).toBe('failed'));

    store.connects = true;
    await act(() => seen().retry());
    await waitFor(() => expect(seen().status).toBe('ready'));

    expect(store.disconnections).toBe(1);
    expect(store.events).not.toBeNull();
    await act(() => seen().buy('tip_small'));
    expect(seen().notice).toEqual({ about: 'tips', kind: 'thanks' });
  });

  it('confirms what was paid while the app was closed, without a word', async () => {
    const subscription = purchaseOf(PREMIUM_ID);
    const tip = purchaseOf('tip_small');
    const store = fakeStore({ ownedNow: owning(subscription, tip) });
    await startReady(store);

    await waitFor(() => expect(store.finished).toEqual([subscription, tip]));
    expect(seen().premium).toBe(true);
    expect(seen().notice).toBeNull();
  });

  it('lets go of the store when the app closes', async () => {
    const store = fakeStore();
    const view = await startReady(store);
    await view.unmount();
    await waitFor(() => expect(store.disconnections).toBe(1));
  });

  it('does not leave a connection open that was still being made when the app closed', async () => {
    const store = fakeStore();
    const connect = holdConnecting(store);
    const view = await start(store);
    await view.unmount();
    expect(store.disconnections).toBe(0);

    await connect();
    expect(store.disconnections).toBe(1);
    expect(store.events).toBeNull();
  });
});

describe('subscribing', () => {
  it('opens the premium set, says so and acknowledges the subscription once', async () => {
    const store = fakeStore({
      pay: (id, self) => {
        const subscription = purchaseOf(id);
        self.ownedNow = owning(subscription);
        // Google Play may well report it twice: once from the sheet, once on reconnecting.
        self.report(subscription);
        self.report(subscription);
        return { ok: true };
      },
    });
    await startReady(store);

    await act(() => seen().buy(PREMIUM_ID));

    expect(seen().premium).toBe(true);
    expect(seen().notice).toEqual({ about: 'premium', kind: 'premiumOn' });
    expect(seen().busy).toBeNull();
    await waitFor(() => expect(store.finished).toHaveLength(1));
    await expect(loadCachedPremium(Date.now())).resolves.toBe(true);
  });

  it('waits for a payment that is still on its way, and opens once it arrives', async () => {
    const pending = purchaseOf(PREMIUM_ID, { state: 'pending' });
    const store = fakeStore({
      pay: (_id, self) => {
        self.report(pending);
        return { ok: true };
      },
    });
    await startReady(store);

    await act(() => seen().buy(PREMIUM_ID));
    expect(seen().notice).toEqual({ about: 'premium', kind: 'pending' });
    expect(seen().premium).toBe(false);
    expect(store.finished).toEqual([]);

    await act(() => store.report({ ...pending, state: 'purchased' }));
    expect(seen().premium).toBe(true);
    await waitFor(() => expect(store.finished).toHaveLength(1));
  });

  it('says nothing when the person closes the payment sheet', async () => {
    const store = fakeStore({ pay: () => ({ ok: false, problem: 'cancelled' }) });
    await startReady(store);

    await act(() => seen().buy(PREMIUM_ID));
    expect(seen()).toMatchObject({ notice: null, busy: null, premium: false });
  });

  it('finds a subscription that was running already', async () => {
    const store = fakeStore({
      ownedNow: owning(),
      pay: (_id, self) => {
        // Bought on another phone a minute ago.
        self.ownedNow = owning(runningSubscription());
        return { ok: false, problem: 'alreadyOwned' };
      },
    });
    await startReady(store);

    await act(() => seen().buy(PREMIUM_ID));
    expect(seen().premium).toBe(true);
    expect(seen().notice).toEqual({ about: 'premium', kind: 'restored' });
  });

  it('is not undone by a list the store sent before the subscription', async () => {
    let answer: (owned: Owned) => void = () => {};
    const store = fakeStore();
    await startReady(store);

    store.owned = () => new Promise((resolve) => (answer = resolve));
    await backToFront();
    await act(() => store.report(purchaseOf(PREMIUM_ID)));
    await act(async () => answer(owning()));

    expect(seen().premium).toBe(true);
  });

  it('opens the subscription in the store to cancel it, or says it could not', async () => {
    const store = fakeStore();
    await startReady(store);

    await act(() => seen().manage());
    expect(store.managed).toBe(1);

    store.manage = () => Promise.reject(new Error('no Play Store app'));
    await act(() => seen().manage());
    expect(seen().notice).toEqual({ about: 'premium', kind: 'failed' });
  });
});

describe('tipping', () => {
  it('thanks and uses the tip up, so another can be given', async () => {
    const store = fakeStore();
    await startReady(store);

    await act(() => seen().buy('tip_medium'));
    expect(seen().notice).toEqual({ about: 'tips', kind: 'thanks' });
    await waitFor(() => expect(store.finished.map((purchase) => purchase.productId)).toEqual(['tip_medium']));
    expect(seen().premium).toBe(false);
  });

  it('says what went wrong', async () => {
    const store = fakeStore({ pay: () => ({ ok: false, problem: 'network' }) });
    await startReady(store);

    await act(() => seen().buy('tip_small'));
    expect(seen().notice).toEqual({ about: 'tips', kind: 'network' });
  });

  it('uses up an earlier tip that was never used up, and says another can be given now', async () => {
    const leftover = purchaseOf('tip_large');
    const store = fakeStore({ finishFails: true, ownedNow: owning(leftover), pay: () => ({ ok: false, problem: 'alreadyOwned' }) });
    await startReady(store);
    expect(store.finished).toEqual([]);

    store.finishFails = false;
    await act(() => seen().buy('tip_large'));
    expect(seen().notice).toEqual({ about: 'tips', kind: 'tipCleared' });
    expect(store.finished).toEqual([leftover]);
  });

  it('buys one thing at a time', async () => {
    let close: () => void = () => {};
    const store = fakeStore();
    const buy = jest.fn(() => new Promise<{ ok: true }>((resolve) => (close = () => resolve({ ok: true }))));
    store.buy = buy;
    await startReady(store);

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = seen().buy('tip_small');
    });
    expect(seen().busy).toBe('tip_small');
    await act(() => seen().buy('tip_large'));
    await act(async () => {
      close();
      await first;
    });

    expect(buy).toHaveBeenCalledTimes(1);
    expect(seen().busy).toBeNull();
  });

  it('turns a store that throws into a notice', async () => {
    const store = fakeStore();
    store.buy = () => Promise.reject(new Error('native crash'));
    await startReady(store);

    await act(() => seen().buy('tip_small'));
    expect(seen()).toMatchObject({ busy: null, notice: { about: 'tips', kind: 'failed' } });
  });
});

describe('asking the store again', () => {
  it('finds the subscription, or says there is none', async () => {
    const store = fakeStore();
    await startReady(store);

    await act(() => seen().restore());
    expect(seen().notice).toEqual({ about: 'restore', kind: 'nothingToRestore' });

    store.ownedNow = owning(runningSubscription());
    await act(() => seen().restore());
    expect(seen().notice).toEqual({ about: 'restore', kind: 'restored' });
    expect(seen().premium).toBe(true);
  });

  it('lists the products again, in case they were missing', async () => {
    const store = fakeStore({ productsNow: [] });
    await startReady(store);
    expect(seen().products).toEqual([]);

    store.productsNow = [{ id: 'tip_small', price: '$0.99' }];
    await act(() => seen().restore());
    expect(seen().products).toEqual([{ id: 'tip_small', price: '$0.99' }]);
  });

  it('says when the store cannot be asked, and keeps premium as it was', async () => {
    const store = fakeStore({ ownedNow: owning(runningSubscription()) });
    await startReady(store);

    store.ownedNow = { ok: false, problem: 'billing' };
    await act(() => seen().restore());
    expect(seen().notice).toEqual({ about: 'restore', kind: 'billing' });
    expect(seen().premium).toBe(true);
  });

  it('happens on its own when the app comes back to the front', async () => {
    const store = fakeStore({ ownedNow: owning(runningSubscription()) });
    await startReady(store);

    // Cancelled in Google Play, and the paid month is over.
    store.ownedNow = owning();
    await backToFront();
    expect(seen().premium).toBe(false);
    expect(seen().notice).toBeNull();
  });

  it('confirms on the next try what the store refused to confirm', async () => {
    const subscription = purchaseOf(PREMIUM_ID);
    const store = fakeStore({ finishFails: true, ownedNow: owning(subscription) });
    await startReady(store);
    expect(store.finished).toEqual([]);

    store.finishFails = false;
    await backToFront();
    await waitFor(() => expect(store.finished).toEqual([subscription]));
  });
});

it('tells the premium state on its own', async () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PurchasesProvider initialPremium store={null}>
      {children}
    </PurchasesProvider>
  );
  const { result } = await renderHook(() => usePremium(), { wrapper });
  expect(result.current).toBe(true);
});

it('is needed above anything that asks', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(renderHook(() => usePurchases())).rejects.toThrow('usePurchases needs a PurchasesProvider above it');
});
