import { bodyWeightAt, FALLBACK_BODY_WEIGHT_KG, latestBodyWeight } from '../bodyWeight';

const weights = [
  { date: '2026-03-01', kg: 80 },
  { date: '2026-01-10', kg: 78 },
  { date: '2026-06-20', kg: 82.5 },
];

describe('bodyWeightAt', () => {
  it('is the latest weigh-in on or before the day', () => {
    expect(bodyWeightAt('2026-02-15', weights)).toBe(78);
    expect(bodyWeightAt('2026-03-01', weights)).toBe(80);
    expect(bodyWeightAt('2026-12-31', weights)).toBe(82.5);
  });

  it('uses the earliest weigh-in for a workout older than all of them', () => {
    expect(bodyWeightAt('2025-05-05', weights)).toBe(78);
  });

  it('is unknown when nothing has been weighed', () => {
    expect(bodyWeightAt('2026-02-15', [])).toBeNull();
  });

  it('ignores weigh-ins that are not a weight', () => {
    expect(bodyWeightAt('2026-02-15', [{ date: '2026-02-01', kg: 0 }, ...weights])).toBe(78);
    expect(bodyWeightAt('2026-02-15', [{ date: '2026-02-01', kg: NaN }])).toBeNull();
  });
});

describe('latestBodyWeight', () => {
  it('is the most recent weigh-in whatever order they come in', () => {
    expect(latestBodyWeight(weights)).toBe(82.5);
    expect(latestBodyWeight([])).toBeNull();
  });
});

describe('the stand-in body weight', () => {
  it('is the 75 kg Record assumed', () => {
    expect(FALLBACK_BODY_WEIGHT_KG).toBe(75);
  });
});
