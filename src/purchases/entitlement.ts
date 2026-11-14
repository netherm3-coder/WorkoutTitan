import { isProductId, PREMIUM_ID } from './catalog';
import type { StorePurchase } from './store';

/**
 * Whether what the store reports opens the premium set: a paid subscription that is not on
 * hold. A payment still waiting, or one that failed, opens nothing.
 *
 * The store only reports a subscription while it runs, including the rest of a month already
 * paid after the person cancels, so there are no dates to check here.
 */
export function hasPremium(purchases: readonly StorePurchase[]): boolean {
  return purchases.some(
    (purchase) => purchase.productId === PREMIUM_ID && purchase.state === 'purchased' && !purchase.suspended,
  );
}

/**
 * Whether a purchase still has to be confirmed to the store. A tip is used up so it can be
 * given again; the subscription is acknowledged once. A pending purchase waits until it is
 * paid, and a product the app does not sell is not its business.
 */
export function needsFinishing(purchase: StorePurchase): boolean {
  if (purchase.state !== 'purchased' || !isProductId(purchase.productId)) return false;
  return purchase.productId === PREMIUM_ID ? !purchase.acknowledged : true;
}
