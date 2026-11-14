import * as Iap from 'expo-iap';

import { createPlayStore, fromPlay, problemOf } from '../playStore';
import type { StoreEvents } from '../store';

// The billing library is native. What it would answer is set up test by test.
jest.mock('expo-iap', () => ({
  ErrorCode: jest.requireActual('expo-iap/build/types').ErrorCode,
  initConnection: jest.fn(),
  endConnection: jest.fn(),
  purchaseUpdatedListener: jest.fn(),
  fetchProducts: jest.fn(),
  getAvailablePurchases: jest.fn(),
  requestPurchase: jest.fn(),
  finishTransaction: jest.fn(),
  deepLinkToSubscriptions: jest.fn(),
}));

const iap = jest.mocked(Iap);

/** A purchase as expo-iap reports one on Android. */
function playPurchase(changes: Record<string, unknown> = {}) {
  return {
    id: 'GPA.1234-5678',
    productId: 'premium_monthly',
    purchaseToken: 'play-token',
    purchaseState: 'purchased',
    isAcknowledgedAndroid: false,
    isSuspendedAndroid: false,
    isAutoRenewing: true,
    quantity: 1,
    store: 'google',
    storeId: 'GPA.1234-5678',
    transactionDate: 1_700_000_000_000,
    ...changes,
  } as unknown as Iap.Purchase;
}

/** The subscription as Google Play lists it: a yearly plan the app does not sell, and the monthly one. */
const SUBSCRIPTION = {
  id: 'premium_monthly',
  displayPrice: '$15.00',
  subscriptionOffers: [
    { id: 'yearly', basePlanIdAndroid: 'yearly', offerTokenAndroid: 'offer-yearly', displayPrice: '$15.00' },
    { id: 'monthly', basePlanIdAndroid: 'monthly', offerTokenAndroid: 'offer-monthly', displayPrice: '$1.50' },
  ],
};
const TIPS = [
  { id: 'tip_large', displayPrice: '$4.99' },
  { id: 'tip_small', displayPrice: '$0.99' },
];

/** Google Play with the products above, unless a test says otherwise. */
function listProducts(subscriptions: unknown[] = [SUBSCRIPTION], tips: unknown[] = TIPS) {
  iap.fetchProducts.mockImplementation(async (request) => (request.type === 'subs' ? subscriptions : tips) as never);
}

const remove = jest.fn();
const events: StoreEvents = { onPurchase: jest.fn() };
let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  iap.purchaseUpdatedListener.mockReturnValue({ remove });
  iap.initConnection.mockResolvedValue(true);
  iap.endConnection.mockResolvedValue(true);
  listProducts();
});

afterEach(() => {
  warn.mockRestore();
});

describe('connecting to Google Play', () => {
  it('listens for purchases before it connects, and passes them on', async () => {
    const store = createPlayStore();
    await expect(store.connect(events)).resolves.toBe(true);

    const listenedAt = iap.purchaseUpdatedListener.mock.invocationCallOrder[0]!;
    expect(listenedAt).toBeLessThan(iap.initConnection.mock.invocationCallOrder[0]!);

    const listener = iap.purchaseUpdatedListener.mock.calls[0]![0];
    listener(playPurchase());
    expect(events.onPurchase).toHaveBeenCalledWith(expect.objectContaining({ productId: 'premium_monthly', token: 'play-token' }));
  });

  it('stops listening when the store does not answer', async () => {
    iap.initConnection.mockRejectedValueOnce(Object.assign(new Error('no billing'), { code: 'billing-unavailable' }));
    await expect(createPlayStore().connect(events)).resolves.toBe(false);
    expect(remove).toHaveBeenCalledTimes(1);

    iap.initConnection.mockResolvedValueOnce(false);
    await expect(createPlayStore().connect(events)).resolves.toBe(false);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('lets go of the listener and the connection when done, even if the store objects', async () => {
    const store = createPlayStore();
    await store.connect(events);
    iap.endConnection.mockRejectedValueOnce(new Error('already closed'));

    await expect(store.disconnect()).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(iap.endConnection).toHaveBeenCalledTimes(1);
  });
});

describe('the products', () => {
  it('come with the price of the monthly plan and the tips in order, smallest first', async () => {
    await expect(createPlayStore().products()).resolves.toEqual([
      { id: 'premium_monthly', price: '$1.50' },
      { id: 'tip_small', price: '$0.99' },
      { id: 'tip_large', price: '$4.99' },
    ]);
    expect(iap.fetchProducts).toHaveBeenCalledWith({ skus: ['premium_monthly'], type: 'subs' });
    expect(iap.fetchProducts).toHaveBeenCalledWith({ skus: ['tip_small', 'tip_medium', 'tip_large'], type: 'in-app' });
  });

  it('take the first plan the store has when none is called "monthly"', async () => {
    listProducts([{ ...SUBSCRIPTION, subscriptionOffers: [SUBSCRIPTION.subscriptionOffers[0]] }]);
    await expect(createPlayStore().products()).resolves.toContainEqual({ id: 'premium_monthly', price: '$15.00' });
  });

  it('leave out what the store does not sell, or cannot list', async () => {
    listProducts([{ ...SUBSCRIPTION, subscriptionOffers: [] }], []);
    await expect(createPlayStore().products()).resolves.toEqual([]);

    iap.fetchProducts.mockRejectedValue(new Error('offline'));
    await expect(createPlayStore().products()).resolves.toEqual([]);
  });
});

describe('buying', () => {
  it('subscribes to the monthly plan the store listed', async () => {
    const store = createPlayStore();
    await store.products();

    await expect(store.buy('premium_monthly')).resolves.toEqual({ ok: true });
    expect(iap.requestPurchase).toHaveBeenCalledWith({
      type: 'subs',
      request: { google: { skus: ['premium_monthly'], subscriptionOffers: [{ sku: 'premium_monthly', offerToken: 'offer-monthly' }] } },
    });
  });

  it('does not open the payment sheet for a subscription the store has not listed', async () => {
    listProducts([]);
    const store = createPlayStore();
    await store.products();

    await expect(store.buy('premium_monthly')).resolves.toEqual({ ok: false, problem: 'unavailable' });
    expect(iap.requestPurchase).not.toHaveBeenCalled();
  });

  it('buys a tip as a one-off product', async () => {
    await expect(createPlayStore().buy('tip_medium')).resolves.toEqual({ ok: true });
    expect(iap.requestPurchase).toHaveBeenCalledWith({ type: 'in-app', request: { google: { skus: ['tip_medium'] } } });
  });

  it('says what went wrong, and keeps quiet about a closed payment sheet', async () => {
    const store = createPlayStore();
    iap.requestPurchase.mockRejectedValueOnce({ code: 'user-cancelled', message: 'cancelled' });
    await expect(store.buy('tip_small')).resolves.toEqual({ ok: false, problem: 'cancelled' });
    expect(warn).not.toHaveBeenCalled();

    iap.requestPurchase.mockRejectedValueOnce({ code: 'network-error', message: 'offline' });
    await expect(store.buy('tip_small')).resolves.toEqual({ ok: false, problem: 'network' });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('what the person owns', () => {
  it('is what Google Play lists, in the app terms', async () => {
    iap.getAvailablePurchases.mockResolvedValueOnce([playPurchase({ isAcknowledgedAndroid: true })]);
    await expect(createPlayStore().owned()).resolves.toEqual({
      ok: true,
      purchases: [expect.objectContaining({ productId: 'premium_monthly', state: 'purchased', acknowledged: true })],
    });
  });

  it('is unknown when Google Play cannot list it', async () => {
    iap.getAvailablePurchases.mockRejectedValueOnce({ code: 'service-disconnected' });
    await expect(createPlayStore().owned()).resolves.toEqual({ ok: false, problem: 'billing' });
  });
});

describe('confirming a purchase', () => {
  it('uses up a tip and acknowledges the subscription, with the store record it came with', async () => {
    const store = createPlayStore();
    const tip = playPurchase({ productId: 'tip_large' });
    const subscription = playPurchase();

    await store.finish(fromPlay(tip));
    await store.finish(fromPlay(subscription));

    expect(iap.finishTransaction).toHaveBeenNthCalledWith(1, { purchase: tip, isConsumable: true });
    expect(iap.finishTransaction).toHaveBeenNthCalledWith(2, { purchase: subscription, isConsumable: false });
  });

  it('throws when the store refuses, so the purchase is tried again later', async () => {
    iap.finishTransaction.mockRejectedValueOnce({ code: 'service-error' });
    await expect(createPlayStore().finish(fromPlay(playPurchase()))).rejects.toEqual({ code: 'service-error' });
  });
});

it('opens the subscription of this app in Google Play', async () => {
  await createPlayStore().manage();
  expect(iap.deepLinkToSubscriptions).toHaveBeenCalledWith({ skuAndroid: 'premium_monthly', packageNameAndroid: 'com.netherm3.record' });
});

describe('a purchase from the store', () => {
  it('keeps what matters to the app', () => {
    const original = playPurchase({ isAcknowledgedAndroid: true, isSuspendedAndroid: true });
    expect(fromPlay(original)).toEqual({
      productId: 'premium_monthly',
      token: 'play-token',
      state: 'purchased',
      acknowledged: true,
      suspended: true,
      original,
    });
  });

  it('counts missing flags as "no" and a state it does not know as unknown', () => {
    const purchase = fromPlay(playPurchase({ isAcknowledgedAndroid: undefined, isSuspendedAndroid: null, purchaseState: 'deferred' }));
    expect(purchase).toMatchObject({ acknowledged: false, suspended: false, state: 'unknown' });
    expect(fromPlay(playPurchase({ purchaseState: 'pending' })).state).toBe('pending');
  });

  it('is told apart by its order id when it has no token', () => {
    expect(fromPlay(playPurchase({ purchaseToken: null })).token).toBe('GPA.1234-5678');
  });
});

describe('an error from the store', () => {
  it.each([
    ['user-cancelled', 'cancelled'],
    ['already-owned', 'alreadyOwned'],
    ['pending', 'pending'],
    ['deferred-payment', 'pending'],
    ['network-error', 'network'],
    ['service-timeout', 'network'],
    ['item-unavailable', 'unavailable'],
    ['sku-not-found', 'unavailable'],
    ['sku-offer-mismatch', 'unavailable'],
    ['query-product', 'unavailable'],
    ['billing-unavailable', 'billing'],
    ['iap-not-available', 'billing'],
    ['init-connection', 'billing'],
    ['not-prepared', 'billing'],
    ['connection-closed', 'billing'],
    ['service-disconnected', 'billing'],
    ['service-error', 'billing'],
    ['developer-error', 'failed'],
    ['unknown', 'failed'],
  ])('"%s" is told as %s', (code, problem) => {
    expect(problemOf({ code })).toBe(problem);
  });

  it('without a code is a failure', () => {
    expect(problemOf(new Error('boom'))).toBe('failed');
    expect(problemOf(null)).toBe('failed');
    expect(problemOf('boom')).toBe('failed');
  });
});
