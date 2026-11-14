/**
 * What the app sells in Google Play. The ids are the product ids set up in Play Console and
 * have to match it letter for letter; docs/purchases.md lists them with their prices.
 */

/** The subscription that opens the premium set of the camp. */
export const PREMIUM_ID = 'premium_monthly';

/** Its base plan in Play Console: one month, renewing on its own. */
export const PREMIUM_BASE_PLAN = 'monthly';

/**
 * One-off tips to the author, smallest first. A tip opens nothing and can be given again, so
 * each one is used up in the store as soon as it is paid.
 */
export const TIP_IDS = ['tip_small', 'tip_medium', 'tip_large'] as const;

export type TipId = (typeof TIP_IDS)[number];
export type ProductId = typeof PREMIUM_ID | TipId;

export function isTipId(id: string): id is TipId {
  return (TIP_IDS as readonly string[]).includes(id);
}

export function isProductId(id: string): id is ProductId {
  return id === PREMIUM_ID || isTipId(id);
}

/** The app in Google Play, for the link to its subscription there. The same as in app.json. */
export const ANDROID_PACKAGE = 'com.netherm3.record';
