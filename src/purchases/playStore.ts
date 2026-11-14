import {
  deepLinkToSubscriptions,
  endConnection,
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseUpdatedListener,
  requestPurchase,
  type FetchProductsResult,
  type Purchase,
  type PurchaseAndroid,
  type SubscriptionOffer,
} from 'expo-iap';

import { ANDROID_PACKAGE, isTipId, PREMIUM_BASE_PLAN, PREMIUM_ID, TIP_IDS } from './catalog';
import type { PurchaseProblem, PurchaseStore, StoreProduct, StorePurchase } from './store';

/**
 * Google Play, through expo-iap. Works only in a build of the app: Expo Go has no billing
 * module in it, and `createPurchaseStore` does not hand this out there.
 *
 * Successful purchases arrive only through the purchase listener. The library also resolves
 * `requestPurchase` with them, and taking both would confirm and thank twice. Failures arrive
 * only as the rejection of `requestPurchase`, for the same reason: the library sends each one
 * as an event as well, and that event is not listened to.
 */
export function createPlayStore(): PurchaseStore {
  let listeners: { remove(): void }[] = [];
  /** Which plan of the subscription to buy. Google Play hands it out with the product. */
  let premiumOffer: string | null = null;

  const removeListeners = () => {
    for (const listener of listeners) listener.remove();
    listeners = [];
  };

  return {
    async connect(events) {
      try {
        // The listener goes first: the store may report purchases as soon as it connects.
        listeners = [purchaseUpdatedListener((purchase) => events.onPurchase(fromPlay(purchase)))];
        if (await initConnection()) return true;
      } catch (error) {
        console.warn('Google Play did not connect', error);
      }
      removeListeners();
      return false;
    },

    async products() {
      const [subscriptions, tips] = await Promise.all([
        ask(() => fetchProducts({ skus: [PREMIUM_ID], type: 'subs' })),
        ask(() => fetchProducts({ skus: [...TIP_IDS], type: 'in-app' })),
      ]);
      const found: StoreProduct[] = [];

      const premium = subscriptions.find((product) => product.id === PREMIUM_ID);
      const offer = premium ? planOf(premium.subscriptionOffers ?? []) : undefined;
      premiumOffer = offer?.offerTokenAndroid ?? null;
      if (offer && premiumOffer !== null) found.push({ id: PREMIUM_ID, price: offer.displayPrice });

      for (const id of TIP_IDS) {
        const tip = tips.find((product) => product.id === id);
        if (tip) found.push({ id, price: tip.displayPrice });
      }
      return found;
    },

    async owned() {
      try {
        const purchases = await getAvailablePurchases();
        return { ok: true, purchases: purchases.map(fromPlay) };
      } catch (error) {
        console.warn('Google Play did not list the purchases', error);
        return { ok: false, problem: problemOf(error) };
      }
    },

    async buy(id) {
      try {
        if (id === PREMIUM_ID) {
          if (premiumOffer === null) return { ok: false, problem: 'unavailable' };
          await requestPurchase({
            type: 'subs',
            request: { google: { skus: [id], subscriptionOffers: [{ sku: id, offerToken: premiumOffer }] } },
          });
        } else {
          await requestPurchase({ type: 'in-app', request: { google: { skus: [id] } } });
        }
        return { ok: true };
      } catch (error) {
        const problem = problemOf(error);
        if (problem !== 'cancelled') console.warn(`Could not buy ${id}`, error);
        return { ok: false, problem };
      }
    },

    async finish(purchase) {
      await finishTransaction({ purchase: purchase.original as Purchase, isConsumable: isTipId(purchase.productId) });
    },

    async manage() {
      await deepLinkToSubscriptions({ skuAndroid: PREMIUM_ID, packageNameAndroid: ANDROID_PACKAGE });
    },

    async disconnect() {
      removeListeners();
      try {
        await endConnection();
      } catch (error) {
        console.warn('Google Play did not disconnect', error);
      }
    },
  };
}

/** The store's record in the app's terms. */
export function fromPlay(purchase: Purchase): StorePurchase {
  const android = purchase as Partial<Pick<PurchaseAndroid, 'isAcknowledgedAndroid' | 'isSuspendedAndroid'>>;
  const state = purchase.purchaseState;
  return {
    productId: purchase.productId,
    token: purchase.purchaseToken ?? purchase.id,
    state: state === 'purchased' || state === 'pending' ? state : 'unknown',
    acknowledged: android.isAcknowledgedAndroid === true,
    suspended: android.isSuspendedAndroid === true,
    original: purchase,
  };
}

/**
 * The plan of the subscription to buy: the monthly base plan. Should it be named differently
 * in Play Console, the first plan the store offers is taken, so buying still works.
 */
function planOf(offers: readonly SubscriptionOffer[]): SubscriptionOffer | undefined {
  const plans = offers.filter((offer) => offer.offerTokenAndroid);
  return plans.find((offer) => offer.basePlanIdAndroid === PREMIUM_BASE_PLAN) ?? plans[0];
}

/** Asks for products. A store that cannot answer sells nothing, which the screen says. */
async function ask(query: () => Promise<FetchProductsResult>): Promise<NonNullable<FetchProductsResult>> {
  try {
    return (await query()) ?? [];
  } catch (error) {
    console.warn('Google Play did not list the products', error);
    return [];
  }
}

/** What went wrong, from the library's error code. */
export function problemOf(error: unknown): PurchaseProblem {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  switch (code) {
    case ErrorCode.UserCancelled:
      return 'cancelled';
    case ErrorCode.AlreadyOwned:
      return 'alreadyOwned';
    case ErrorCode.Pending:
    case ErrorCode.DeferredPayment:
      return 'pending';
    case ErrorCode.NetworkError:
    case ErrorCode.ServiceTimeout:
      return 'network';
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
    case ErrorCode.SkuOfferMismatch:
    case ErrorCode.QueryProduct:
      return 'unavailable';
    case ErrorCode.BillingUnavailable:
    case ErrorCode.IapNotAvailable:
    case ErrorCode.InitConnection:
    case ErrorCode.NotPrepared:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.ServiceDisconnected:
    case ErrorCode.ServiceError:
      return 'billing';
    default:
      return 'failed';
  }
}
