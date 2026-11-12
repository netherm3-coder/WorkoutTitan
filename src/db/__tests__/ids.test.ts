import { newId } from '../ids';

describe('newId', () => {
  it('is 21 characters of digits and small letters', () => {
    expect(newId()).toMatch(/^[0-9a-z]{21}$/);
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 20_000 }, () => newId(1_770_000_000_000)));
    expect(ids.size).toBe(20_000);
  });

  it('sorts by the moment it was made', () => {
    const earlier = newId(1_770_000_000_000);
    const later = newId(1_770_000_000_001);
    const muchLater = newId(4_102_444_800_000);

    expect(earlier < later).toBe(true);
    expect(later < muchLater).toBe(true);
  });
});
