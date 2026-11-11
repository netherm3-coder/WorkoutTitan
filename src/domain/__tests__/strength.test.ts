import {
  cappedEpley,
  epley,
  oneRepMaxAddedKg,
  oneRepMaxKg,
  relativeStrength,
  RM_REPS_CAP,
  strengthIndex,
} from '../strength';

describe('epley', () => {
  it('leaves a single rep as it is', () => {
    expect(epley(1)).toBe(1);
    expect(epley(0)).toBe(1);
  });

  it('adds a thirtieth of the weight for every rep', () => {
    expect(epley(3)).toBeCloseTo(1.1, 10);
    expect(epley(30)).toBe(2);
  });

  it('stops growing at the cap when asked to', () => {
    expect(RM_REPS_CAP).toBe(10);
    expect(cappedEpley(15)).toBe(epley(10));
    expect(cappedEpley(8)).toBe(epley(8));
  });
});

describe('strengthIndex', () => {
  it('scales body weight plus load by the reps', () => {
    expect(strengthIndex(12, 20, 80)).toBeCloseTo(140, 10);
    expect(strengthIndex(1, 40, 80)).toBe(120);
  });

  it('keeps growing past the cap, so 20 reps always beat 15', () => {
    expect(strengthIndex(20, 0, 80)).toBeGreaterThan(strengthIndex(15, 0, 80));
  });
});

describe('oneRepMaxAddedKg', () => {
  it('is the extra load a single rep could carry, to 0.1 kg', () => {
    expect(oneRepMaxAddedKg(12, 20, 80)).toBe(53.3);
    expect(oneRepMaxAddedKg(5, 0, 75)).toBe(12.5);
  });

  it('counts reps above the cap as the cap', () => {
    expect(oneRepMaxAddedKg(25, 0, 80)).toBe(oneRepMaxAddedKg(10, 0, 80));
  });

  it('is zero for one clean rep and for no reps', () => {
    expect(oneRepMaxAddedKg(1, 0, 80)).toBe(0);
    expect(oneRepMaxAddedKg(0, 20, 80)).toBe(0);
  });
});

describe('oneRepMaxKg', () => {
  it('estimates the heaviest single lift, to 0.1 kg', () => {
    expect(oneRepMaxKg(1, 100)).toBe(100);
    expect(oneRepMaxKg(5, 100)).toBe(116.7);
    expect(oneRepMaxKg(12, 100)).toBe(133.3);
  });

  it('is zero without reps or without weight', () => {
    expect(oneRepMaxKg(0, 100)).toBe(0);
    expect(oneRepMaxKg(5, 0)).toBe(0);
  });
});

describe('relativeStrength', () => {
  it('is the estimated one-rep max in body weights', () => {
    expect(relativeStrength(1, 0, 80)).toBe(1);
    expect(relativeStrength(10, 20, 80)).toBeCloseTo(1.6667, 4);
  });
});
