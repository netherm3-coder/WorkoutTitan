import { PREMIUM_ID, type ProductId } from '../catalog';
import type { Bought, Owned, PurchaseStore, StoreEvents, StoreProduct, StorePurchase } from '../store';

let tokens = 0;

/** A purchase as the store reports it: paid and not yet confirmed, unless told otherwise. */
export function purchaseOf(productId: string, changes: Partial<StorePurchase> = {}): StorePurchase {
  tokens += 1;
  return {
    productId,
    token: `token-${tokens}`,
    state: 'purchased',
    acknowledged: false,
    suspended: false,
    original: { productId },
    ...changes,
  };
}

/** A running subscription, confirmed long ago. */
export const runningSubscription = () => purchaseOf(PREMIUM_ID, { acknowledged: true });

/** Prices as Google Play would show them to a buyer in the US. */
export const PRICES: StoreProduct[] = [
  { id: PREMIUM_ID, price: '$1.50' },
  { id: 'tip_small', price: '$0.99' },
  { id: 'tip_medium', price: '$2.99' },
  { id: 'tip_large', price: '$4.99' },
];

export type FakeStore = PurchaseStore & {
  /** Whether connecting works. */
  connects: boolean;
  /** What the store reports as owned. Tests change it to stand for renewals, refunds and the like. */
  ownedNow: Owned;
  productsNow: StoreProduct[];
  /** What happens when the person goes through the payment sheet. */
  pay: (id: ProductId, store: FakeStore) => Bought;
  /** What was confirmed to the store, in order. */
  finished: StorePurchase[];
  /** Whether confirming fails. */
  finishFails: boolean;
  managed: number;
  connections: number;
  disconnections: number;
  /** The app's listener while connected. */
  events: StoreEvents | null;
  /** Reports a purchase the way the store does: through the listener. */
  report(purchase: StorePurchase): void;
};

/**
 * A store in memory. By default it connects, sells everything at US prices, the person owns
 * nothing, and paying works: the purchase is reported through the listener, as Google Play
 * does it, and also added to what is owned.
 */
export function fakeStore(changes: Partial<FakeStore> = {}): FakeStore {
  const store: FakeStore = {
    connects: true,
    ownedNow: { ok: true, purchases: [] },
    productsNow: PRICES,
    pay: (id, self) => {
      const purchase = purchaseOf(id);
      if (self.ownedNow.ok) self.ownedNow = { ok: true, purchases: [...self.ownedNow.purchases, purchase] };
      self.report(purchase);
      return { ok: true };
    },
    finished: [],
    finishFails: false,
    managed: 0,
    connections: 0,
    disconnections: 0,
    events: null,

    report(purchase) {
      if (!store.events) throw new Error('The app is not listening to the store');
      store.events.onPurchase(purchase);
    },

    async connect(events) {
      store.connections += 1;
      if (!store.connects) return false;
      store.events = events;
      return true;
    },
    async products() {
      return store.productsNow;
    },
    async owned() {
      return store.ownedNow;
    },
    async buy(id) {
      return store.pay(id, store);
    },
    async finish(purchase) {
      if (store.finishFails) throw new Error('The store refused');
      store.finished.push(purchase);
      // As in Google Play: a used-up tip is gone, a confirmed subscription stays.
      if (!store.ownedNow.ok) return;
      store.ownedNow = {
        ok: true,
        purchases: store.ownedNow.purchases.flatMap((owned) => {
          if (owned.token !== purchase.token) return [owned];
          return owned.productId === PREMIUM_ID ? [{ ...owned, acknowledged: true }] : [];
        }),
      };
    },
    async manage() {
      store.managed += 1;
    },
    async disconnect() {
      store.disconnections += 1;
      store.events = null;
    },
    ...changes,
  };
  return store;
}
