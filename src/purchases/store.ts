import type { ProductId } from './catalog';

/**
 * The shop the app sells through, as the rest of the app sees it. Google Play is the only one
 * so far (`playStore.ts`); tests use a fake. Everything that talks to the store goes through
 * here, so the screens and the premium rule never touch the billing library.
 */
export type PurchaseStore = {
  /**
   * Opens the connection. Purchases that change from now on, including ones that finish while
   * the app is open after a wait, arrive through `events`. Resolves `false` when the store does
   * not answer: no Google account, no Play services, billing switched off.
   */
  connect(events: StoreEvents): Promise<boolean>;
  /** What is for sale, with prices in the buyer's currency. A product the store lacks is left out. */
  products(): Promise<StoreProduct[]>;
  /** What the person owns now: the active subscription, and tips not yet used up. */
  owned(): Promise<Owned>;
  /**
   * Opens the store's payment sheet. Resolves once the sheet is closed. A purchase that went
   * through arrives through `events`, not here.
   */
  buy(id: ProductId): Promise<Bought>;
  /**
   * Confirms a paid purchase to the store: the subscription is acknowledged, a tip is used up.
   * Google refunds a purchase that is not confirmed within three days. Throws when the store
   * refuses; the purchase then stays to be confirmed on the next start.
   */
  finish(purchase: StorePurchase): Promise<void>;
  /** Opens the store's own page of the subscription, where it is cancelled or changed. */
  manage(): Promise<void>;
  disconnect(): Promise<void>;
};

export type StoreEvents = {
  /** A purchase was made or changed. */
  onPurchase(purchase: StorePurchase): void;
};

/** A product with its price as the store shows it, for example "$1.50" or "UAH 60.00". */
export type StoreProduct = { id: ProductId; price: string };

export type StorePurchase = {
  productId: string;
  /** Unique to the purchase. A renewal of a subscription keeps it. */
  token: string;
  /** Only `purchased` is paid. A `pending` purchase waits for the money and opens nothing. */
  state: 'purchased' | 'pending' | 'unknown';
  /** Whether the app has confirmed it to the store already. */
  acknowledged: boolean;
  /** A subscription on hold because the payment failed. It opens nothing until it is paid. */
  suspended: boolean;
  /** The store's own record of the purchase, handed back to it when finishing. */
  original: unknown;
};

/** Why something the person asked of the store did not happen. */
export type PurchaseProblem =
  /** The person closed the payment sheet. Not an error, and nothing is said about it. */
  | 'cancelled'
  /** The person owns it already: the subscription is active, or an earlier tip is not used up. */
  | 'alreadyOwned'
  /** The payment was accepted and waits to be confirmed, for example a cash payment. */
  | 'pending'
  | 'network'
  /** The store does not sell this product here, or not yet. */
  | 'unavailable'
  /** The store itself does not work right now. */
  | 'billing'
  | 'failed';

export type Owned = { ok: true; purchases: StorePurchase[] } | { ok: false; problem: PurchaseProblem };
export type Bought = { ok: true } | { ok: false; problem: PurchaseProblem };
