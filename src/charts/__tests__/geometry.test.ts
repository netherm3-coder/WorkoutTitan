import { geometryOf, scaleOf, TIME_STEPS } from '../geometry';

describe('scaleOf', () => {
  it.each([
    ['reps from zero', [8, 12, 15], { fromZero: true }, { low: 0, high: 20 }],
    ['values off zero', [9.6, 12, 14.8], {}, { low: 5, high: 15 }],
    ['body weight', [78.6, 82.4], {}, { low: 77.5, high: 82.5 }],
    ['one value', [80], {}, { low: 70, high: 90 }],
    ['one value from zero', [12], { fromZero: true }, { low: 0, high: 20 }],
    ['nothing but zeros', [0, 0], { fromZero: true }, { low: 0, high: 1 }],
    ['a top that rounding would cut off', [19, 31], {}, { low: 0, high: 40 }],
  ])('rounds %s', (_name, values, options, scale) => {
    expect(scaleOf(values, options)).toEqual(scale);
  });

  it('falls on clock steps for times: 24:30 to 25:30 in half minutes', () => {
    expect(scaleOf([1_470_000, 1_500_000, 1_530_000], { steps: TIME_STEPS })).toEqual({ low: 1_470_000, high: 1_530_000 });
  });

  it('falls back to round numbers past the longest clock step', () => {
    const { low, high } = scaleOf([0, 3 * 3_600_000], { steps: TIME_STEPS });
    expect(low).toBe(0);
    expect(high).toBeGreaterThanOrEqual(3 * 3_600_000);
  });
});

describe('geometryOf', () => {
  const points = [
    { x: 0, y: 10 },
    { x: 5, y: 15 },
    { x: 10, y: 12 },
  ];

  it('spreads the points over the width by date and over the height by value', () => {
    const { dots, levels } = geometryOf(points, 212, 112, { fromZero: true });

    expect(dots.map((dot) => dot.cx)).toEqual([6, 106, 206]);
    // The scale is 0 to 20 across the 100 points between the edges.
    expect(dots.map((dot) => dot.cy)).toEqual([56, 31, 46]);
    expect(levels).toEqual([
      { y: 6, value: 20 },
      { y: 56, value: 10 },
      { y: 106, value: 0 },
    ]);
  });

  it('draws bigger values higher, and times upside down so that the faster time is higher', () => {
    const times = [
      { x: 0, y: 26 },
      { x: 1, y: 24 },
    ];

    const upright = geometryOf(times, 100, 112);
    expect(upright.dots[0]?.cy).toBeLessThan(upright.dots[1]?.cy ?? 0);
    expect(upright.levels[0]?.value).toBeGreaterThan(upright.levels[2]?.value ?? 0);

    const inverted = geometryOf(times, 100, 112, { invert: true });
    expect(inverted.dots[1]?.cy).toBeLessThan(inverted.dots[0]?.cy ?? 0);
    expect(inverted.levels[0]?.value).toBeLessThan(inverted.levels[2]?.value ?? 0);
  });

  it('puts points of a single day in the middle', () => {
    const { dots } = geometryOf(
      [
        { x: 3, y: 1 },
        { x: 3, y: 2 },
      ],
      112,
      112,
    );
    expect(dots.map((dot) => dot.cx)).toEqual([56, 56]);
  });

  it('writes the line and closes the shading along the bottom', () => {
    const { line, area } = geometryOf(points, 212, 112, { fromZero: true });
    expect(line).toBe('M6 56 L106 31 L206 46');
    expect(area).toBe('M6 56 L106 31 L206 46 L206 106 L6 106 Z');
  });
});
