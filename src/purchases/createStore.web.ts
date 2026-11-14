import type { PurchaseStore } from './store';

/** The web build sells nothing, and so leaves the billing library out of its bundle. */
export function createPurchaseStore(): PurchaseStore | null {
  return null;
}
