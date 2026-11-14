import appJson from '../../../app.json';
import { ANDROID_PACKAGE, isProductId, isTipId, PREMIUM_ID, TIP_IDS } from '../catalog';

describe('what the app sells', () => {
  it('links to the subscription of this very app', () => {
    expect(ANDROID_PACKAGE).toBe(appJson.expo.android.package);
  });

  it('has a product id once each, in the form Play Console accepts', () => {
    const ids = [PREMIUM_ID, ...TIP_IDS];
    expect(new Set(ids).size).toBe(ids.length);
    // Play Console: lowercase letters, digits, underscores and dots, starting with a letter or digit.
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9_.]*$/);
  });

  it('tells tips from the subscription and from strangers', () => {
    expect(TIP_IDS.every(isTipId)).toBe(true);
    expect(isTipId(PREMIUM_ID)).toBe(false);
    expect(isProductId(PREMIUM_ID)).toBe(true);
    expect(isProductId('tip_huge')).toBe(false);
    expect(isProductId('')).toBe(false);
  });
});
