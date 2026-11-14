import { premiumSet, SLOTS, unlockOf } from '@/domain';

import { sceneLayers } from '../sceneLayers';
import { PREMIUM_SHOWCASE } from '../showcase';

describe('the camp shown before buying premium', () => {
  it('wears a premium item in every slot that has one, and nothing else that is closed', () => {
    const premiumSlots = new Set(premiumSet().map(({ slot }) => slot));
    for (const slot of SLOTS) {
      expect([slot, unlockOf(slot, PREMIUM_SHOWCASE[slot]).by]).toEqual([slot, premiumSlots.has(slot) ? 'premium' : 'start']);
    }
  });

  it('is drawn whole: the hat and the pattern are in the picture', () => {
    const layers = sceneLayers(PREMIUM_SHOWCASE).map((layer) => layer.key);
    expect(layers).toEqual(expect.arrayContaining(['sky', 'tent', 'pattern', 'knight', 'hat']));
  });
});
