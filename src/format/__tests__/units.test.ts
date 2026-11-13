import {
  CM_PER_IN,
  decimalsOf,
  defaultUnits,
  isLengthUnit,
  isWeightUnit,
  KG_PER_LB,
  lengthFrom,
  lengthIn,
  METRIC,
  US_UNITS,
  weightFrom,
  weightIn,
} from '../units';

describe('weights', () => {
  it('are left alone in kilograms', () => {
    expect(weightIn(82.5, 'kg')).toBe(82.5);
    expect(weightFrom(82.5, 'kg')).toBe(82.5);
  });

  it('are pounds by the exact definition', () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(weightIn(100, 'lb')).toBeCloseTo(220.462, 3);
    expect(weightFrom(45, 'lb')).toBeCloseTo(20.4117, 4);
  });

  it('come back to what was typed', () => {
    for (const typed of [1, 2.5, 45, 135, 225, 315.5, 999.9]) {
      expect(weightIn(weightFrom(typed, 'lb'), 'lb')).toBeCloseTo(typed, 9);
    }
  });
});

describe('lengths', () => {
  it('are left alone in centimetres', () => {
    expect(lengthIn(81, 'cm')).toBe(81);
    expect(lengthFrom(81, 'cm')).toBe(81);
  });

  it('are inches by the exact definition', () => {
    expect(CM_PER_IN).toBe(2.54);
    expect(lengthIn(254, 'in')).toBeCloseTo(100, 9);
    expect(lengthFrom(32, 'in')).toBeCloseTo(81.28, 9);
  });

  it('come back to what was typed', () => {
    for (const typed of [0.5, 14, 32, 70.5]) {
      expect(lengthIn(lengthFrom(typed, 'in'), 'in')).toBeCloseTo(typed, 9);
    }
  });
});

describe('decimalsOf', () => {
  it('keeps two for metric units and one for pounds and inches', () => {
    expect([decimalsOf('kg'), decimalsOf('cm'), decimalsOf('lb'), decimalsOf('in')]).toEqual([2, 2, 1, 1]);
  });
});

describe('the units of a new phone', () => {
  it.each([
    ['the US system', [{ measurementSystem: 'us' }], US_UNITS],
    ['the metric system', [{ measurementSystem: 'metric' }], METRIC],
    ['the British system', [{ measurementSystem: 'uk' }], METRIC],
    ['nothing said', [{ measurementSystem: null }], METRIC],
    ['no field at all', [{}], METRIC],
    ['no locale at all', [], METRIC],
  ])('follow %s', (_, locales, units) => {
    expect(defaultUnits(locales)).toEqual(units);
  });

  it('go by the first locale only', () => {
    expect(defaultUnits([{ measurementSystem: 'metric' }, { measurementSystem: 'us' }])).toEqual(METRIC);
  });
});

describe('isWeightUnit and isLengthUnit', () => {
  it('accept the units there are and nothing else', () => {
    expect(['kg', 'lb', 'g', null, 1].map(isWeightUnit)).toEqual([true, true, false, false, false]);
    expect(['cm', 'in', 'm', undefined].map(isLengthUnit)).toEqual([true, true, false, false]);
  });
});
