import { PREMIUM_ID } from '../catalog';
import { hasPremium, needsFinishing } from '../entitlement';
import { purchaseOf } from './fakeStore';

describe('premium', () => {
  it('is open with a paid subscription, confirmed or not yet', () => {
    expect(hasPremium([purchaseOf(PREMIUM_ID, { acknowledged: true })])).toBe(true);
    expect(hasPremium([purchaseOf(PREMIUM_ID, { acknowledged: false })])).toBe(true);
  });

  it('is closed without one', () => {
    expect(hasPremium([])).toBe(false);
    expect(hasPremium([purchaseOf('tip_large')])).toBe(false);
  });

  it('stays closed while the payment waits or has failed', () => {
    expect(hasPremium([purchaseOf(PREMIUM_ID, { state: 'pending' })])).toBe(false);
    expect(hasPremium([purchaseOf(PREMIUM_ID, { state: 'unknown' })])).toBe(false);
    expect(hasPremium([purchaseOf(PREMIUM_ID, { suspended: true })])).toBe(false);
  });

  it('does not come from a product the app does not sell', () => {
    expect(hasPremium([purchaseOf('premium_yearly')])).toBe(false);
  });
});

describe('confirming a purchase', () => {
  it('acknowledges the subscription once', () => {
    expect(needsFinishing(purchaseOf(PREMIUM_ID, { acknowledged: false }))).toBe(true);
    expect(needsFinishing(purchaseOf(PREMIUM_ID, { acknowledged: true }))).toBe(false);
  });

  it('uses up every paid tip, so another can be given', () => {
    expect(needsFinishing(purchaseOf('tip_small'))).toBe(true);
    // A tip the store still lists was never used up, whatever it says about acknowledging.
    expect(needsFinishing(purchaseOf('tip_medium', { acknowledged: true }))).toBe(true);
  });

  it('waits until the money is in', () => {
    expect(needsFinishing(purchaseOf(PREMIUM_ID, { state: 'pending' }))).toBe(false);
    expect(needsFinishing(purchaseOf('tip_large', { state: 'pending' }))).toBe(false);
    expect(needsFinishing(purchaseOf('tip_large', { state: 'unknown' }))).toBe(false);
  });

  it('leaves alone what the app does not sell', () => {
    expect(needsFinishing(purchaseOf('coins_100'))).toBe(false);
  });
});
