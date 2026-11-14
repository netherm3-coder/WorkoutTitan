import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isProductId, PREMIUM_ID, type ProductId } from './catalog';
import { hasPremium, needsFinishing } from './entitlement';
import { saveCachedPremium } from './premiumCache';
import type { Owned, PurchaseProblem, PurchaseStore, StoreProduct, StorePurchase } from './store';

export type StoreStatus =
  /** This build sells nothing: Expo Go, the web, and iOS for now. */
  | 'none'
  | 'connecting'
  | 'ready'
  /** The store did not answer. `retry` asks again. */
  | 'failed';

/** What the support screen says after the person asked for something, or a purchase changed. */
export type Notice = {
  /** The part of the screen it belongs to. */
  about: 'premium' | 'tips' | 'restore';
  kind: NoticeKind;
};

export type NoticeKind =
  | 'premiumOn'
  | 'thanks'
  | 'restored'
  | 'nothingToRestore'
  /** A tip that was paid earlier but not used up in the store is now, so another can be given. */
  | 'tipCleared'
  | Exclude<PurchaseProblem, 'cancelled' | 'alreadyOwned'>;

export type Purchases = {
  status: StoreStatus;
  /** Whether the premium set is open. */
  premium: boolean;
  /** What is for sale, with prices. Empty until the store answers, and without what it does not sell. */
  products: StoreProduct[];
  /** What the person is buying right now, or `restore`. One thing at a time. */
  busy: ProductId | 'restore' | null;
  notice: Notice | null;
  buy(id: ProductId): Promise<void>;
  /** Asks the store again what the person owns, and what is for sale. */
  restore(): Promise<void>;
  /** Opens the subscription in the store, to cancel or change it. */
  manage(): Promise<void>;
  /** Connects again after the store did not answer. */
  retry(): void;
  /**
   * Development builds without a store only, such as Expo Go: opens the premium set without
   * buying it, until the app restarts, so it can be looked at on a phone. `null` everywhere else.
   */
  preview: { on: boolean; set(on: boolean): void } | null;
};

const PurchasesContext = createContext<Purchases | null>(null);

export type PurchasesProviderProps = {
  /** What the app sells through, or `null` for a build that sells nothing. Read once. */
  store: PurchaseStore | null;
  /** The store's last answer, saved on the phone. It stands until the store answers again. */
  initialPremium: boolean;
  children: ReactNode;
};

/**
 * Connects to the store when the app starts and keeps the premium state. On every start, and
 * every time the app comes back to the front, it asks the store what the person owns: that is
 * how a subscription that was renewed, cancelled or refunded elsewhere shows up, and how a
 * purchase paid while the app was closed gets confirmed.
 */
export function PurchasesProvider({ store, initialPremium, children }: PurchasesProviderProps) {
  const [status, setStatus] = useState<StoreStatus>(store ? 'connecting' : 'none');
  const [premium, setPremium] = useState(initialPremium);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [busy, setBusy] = useState<ProductId | 'restore' | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  /** Changing it connects again. */
  const [attempt, setAttempt] = useState(0);

  /** The same as `busy`, but current at once, so a second press cannot start a second purchase. */
  const working = useRef(false);
  /** Purchases being confirmed or confirmed already, by token, so one reported twice is confirmed once. */
  const confirmed = useRef(new Set<string>());
  /** How many paid subscriptions the store has reported since the app started. */
  const subscriptionsSeen = useRef(0);
  /** The last connection's opening or closing. A new connection waits for the old one to close. */
  const lifecycle = useRef<Promise<unknown>>(Promise.resolve());

  const keepPremium = useCallback((next: boolean) => {
    setPremium(next);
    void saveCachedPremium(next, Date.now());
  }, []);

  const finish = useCallback(
    async (purchase: StorePurchase) => {
      if (!store || !needsFinishing(purchase) || confirmed.current.has(purchase.token)) return;
      confirmed.current.add(purchase.token);
      try {
        await store.finish(purchase);
      } catch (error) {
        // Left for the next start, which asks the store again. Google waits three days.
        confirmed.current.delete(purchase.token);
        console.warn('Could not confirm a purchase', error);
      }
    },
    [store],
  );

  const refresh = useCallback(async (): Promise<Owned> => {
    if (!store) return { ok: false, problem: 'billing' };
    const seenBefore = subscriptionsSeen.current;
    let owned: Owned;
    try {
      owned = await store.owned();
    } catch (error) {
      console.warn('Could not ask the store for purchases', error);
      return { ok: false, problem: 'failed' };
    }
    if (owned.ok) {
      const paid = hasPremium(owned.purchases);
      // A subscription reported while the list was on its way is newer than the list.
      if (paid || subscriptionsSeen.current === seenBefore) keepPremium(paid);
      await Promise.all(owned.purchases.map(finish));
    }
    return owned;
  }, [store, finish, keepPremium]);

  const listProducts = useCallback(async (): Promise<StoreProduct[]> => {
    if (!store) return [];
    try {
      return await store.products();
    } catch (error) {
      console.warn('Could not ask the store for products', error);
      return [];
    }
  }, [store]);

  const onPurchase = useCallback(
    (purchase: StorePurchase) => {
      if (!isProductId(purchase.productId)) return;
      const about = purchase.productId === PREMIUM_ID ? 'premium' : 'tips';
      if (purchase.state === 'pending') {
        setNotice({ about, kind: 'pending' });
        return;
      }
      if (purchase.state !== 'purchased') return;

      if (purchase.productId !== PREMIUM_ID) {
        setNotice({ about, kind: 'thanks' });
      } else if (!purchase.suspended) {
        subscriptionsSeen.current += 1;
        keepPremium(true);
        setNotice({ about, kind: 'premiumOn' });
      }
      void finish(purchase);
    },
    [finish, keepPremium],
  );

  useEffect(() => {
    if (!store) return;
    let active = true;

    const connecting = lifecycle.current
      .then(() =>
        store.connect({
          onPurchase: (purchase) => {
            if (active) onPurchase(purchase);
          },
        }),
      )
      .catch((error: unknown) => {
        console.warn('Could not connect to the store', error);
        return false;
      });
    lifecycle.current = connecting;

    void (async () => {
      if (!(await connecting)) {
        if (active) setStatus('failed');
        return;
      }
      if (!active) return;
      const [, listed] = await Promise.all([refresh(), listProducts()]);
      if (!active) return;
      setProducts(listed);
      setStatus('ready');
    })();

    return () => {
      active = false;
      // Once the connection is made, so a store still connecting is not left open.
      lifecycle.current = connecting
        .then(() => store.disconnect())
        .catch((error: unknown) => console.warn('Could not disconnect from the store', error));
    };
  }, [store, attempt, onPurchase, refresh, listProducts]);

  useEffect(() => {
    if (status !== 'ready') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [status, refresh]);

  /** Runs one request at a time and shows what came of it. */
  const run = useCallback(
    async (what: ProductId | 'restore', about: Notice['about'], request: () => Promise<NoticeKind | null>) => {
      if (working.current) return;
      working.current = true;
      setBusy(what);
      setNotice(null);
      try {
        const outcome = await request();
        if (outcome) setNotice({ about, kind: outcome });
      } catch (error) {
        console.warn('A request to the store failed', error);
        setNotice({ about, kind: 'failed' });
      } finally {
        working.current = false;
        setBusy(null);
      }
    },
    [],
  );

  const buy = useCallback(
    async (id: ProductId) => {
      if (!store) return;
      await run(id, id === PREMIUM_ID ? 'premium' : 'tips', async () => {
        const bought = await store.buy(id);
        // What was bought arrives as a purchase and says so itself.
        if (bought.ok || bought.problem === 'cancelled') return null;
        if (bought.problem !== 'alreadyOwned') return noticeOf(bought.problem);

        // Either the subscription is running already, or an earlier tip was never used up.
        const owned = await refresh();
        if (!owned.ok) return noticeOf(owned.problem);
        if (id !== PREMIUM_ID) return 'tipCleared';
        return hasPremium(owned.purchases) ? 'restored' : 'failed';
      });
    },
    [store, run, refresh],
  );

  const restore = useCallback(async () => {
    if (!store) return;
    await run('restore', 'restore', async () => {
      const [owned, listed] = await Promise.all([refresh(), listProducts()]);
      setProducts(listed);
      if (!owned.ok) return noticeOf(owned.problem);
      return hasPremium(owned.purchases) ? 'restored' : 'nothingToRestore';
    });
  }, [store, run, refresh, listProducts]);

  const manage = useCallback(async () => {
    if (!store) return;
    try {
      await store.manage();
    } catch (error) {
      console.warn('Could not open the subscription in the store', error);
      setNotice({ about: 'premium', kind: 'failed' });
    }
  }, [store]);

  const retry = useCallback(() => {
    setStatus('connecting');
    setAttempt((count) => count + 1);
  }, []);

  const preview = useMemo(
    () => (status === 'none' && __DEV__ ? { on: previewOn, set: setPreviewOn } : null),
    [status, previewOn],
  );

  const value = useMemo<Purchases>(
    () => ({
      status,
      premium: premium || (preview?.on ?? false),
      products,
      busy,
      notice,
      buy,
      restore,
      manage,
      retry,
      preview,
    }),
    [status, premium, preview, products, busy, notice, buy, restore, manage, retry],
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

/** The person's purchases and what can be bought. Only inside `PurchasesProvider`. */
export function usePurchases(): Purchases {
  const purchases = useContext(PurchasesContext);
  if (!purchases) throw new Error('usePurchases needs a PurchasesProvider above it');
  return purchases;
}

/** Whether the premium set of the camp is open. */
export function usePremium(): boolean {
  return usePurchases().premium;
}

/** A problem as the screen tells it. Cancelling is not one, and owning it already was handled. */
function noticeOf(problem: PurchaseProblem): NoticeKind {
  return problem === 'cancelled' || problem === 'alreadyOwned' ? 'failed' : problem;
}
