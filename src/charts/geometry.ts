/** A point of a chart: `x` grows with time (days since the first point), `y` is the value. */
export type ChartPoint = { x: number; y: number };

export type ScaleOptions = {
  /** Lower values drawn higher: for times, where less is better, so that better is always up. */
  invert?: boolean;
  /** The scale starts at zero, as Record draws reps and weights lifted. Times and body weight hug their values. */
  fromZero?: boolean;
  /** Steps the labels may fall on, smallest first. Times pass steps that read well on a clock. */
  steps?: readonly number[];
};

/** The value range a chart shows: three labelled lines, bottom, middle and top of the scale. */
export type Scale = { low: number; high: number };

/** Steps of 1, 2, 2.5 and 5 in every power of ten. */
function decimalStep(rough: number): number {
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough);
  return step ?? 10 * power;
}

/**
 * The range of the scale: two equal steps that cover every value and fall on round numbers, so
 * that the labels read 10, 15, 20 rather than 9.6, 14.8, 20.
 */
export function scaleOf(values: readonly number[], options: ScaleOptions = {}): Scale {
  let low = Math.min(...values);
  let high = Math.max(...values);
  if (options.fromZero) low = Math.min(0, low);
  if (high === low) {
    // One value, or the same value every time: give it room above and, off zero, below.
    const room = Math.abs(high) * 0.1 || 1;
    high += room;
    if (!options.fromZero) low -= room;
  }

  let rough = (high - low) / 2;
  for (;;) {
    const step = options.steps?.find((candidate) => candidate >= rough) ?? decimalStep(rough);
    const bottom = Math.floor(low / step) * step;
    if (bottom + 2 * step >= high) return { low: bottom, high: bottom + 2 * step };
    // Rounding the bottom down left the top value out: take the next step up.
    rough = step * 1.0001;
  }
}

export type Geometry = {
  /** The line through the points, as SVG path data. */
  line: string;
  /** The same line closed along the bottom, for the shading under it. */
  area: string;
  dots: { cx: number; cy: number }[];
  /** Heights of the three scale lines, top to bottom, with the values they stand for. */
  levels: { y: number; value: number }[];
};

/** Room for a dot at the edges, so the first and the last are not cut in half. */
const EDGE = 6;

/** Where everything goes in a plot of the given size. */
export function geometryOf(points: readonly ChartPoint[], width: number, height: number, options: ScaleOptions = {}): Geometry {
  const scale = scaleOf(
    points.map((point) => point.y),
    options,
  );
  const first = points[0]?.x ?? 0;
  const last = points[points.length - 1]?.x ?? first;
  const span = last - first;

  const plotWidth = Math.max(0, width - 2 * EDGE);
  const plotHeight = Math.max(0, height - 2 * EDGE);
  const xOf = (x: number) => EDGE + (span === 0 ? plotWidth / 2 : ((x - first) / span) * plotWidth);
  const yOf = (value: number) => {
    const share = (value - scale.low) / (scale.high - scale.low);
    return EDGE + (options.invert ? share : 1 - share) * plotHeight;
  };

  const dots = points.map((point) => ({ cx: xOf(point.x), cy: yOf(point.y) }));
  const line = dots.map(({ cx, cy }, index) => `${index === 0 ? 'M' : 'L'}${round(cx)} ${round(cy)}`).join(' ');
  const bottom = round(EDGE + plotHeight);
  const area =
    dots.length > 0
      ? `${line} L${round(dots[dots.length - 1]?.cx ?? 0)} ${bottom} L${round(dots[0]?.cx ?? 0)} ${bottom} Z`
      : '';

  const middle = (scale.low + scale.high) / 2;
  const levels = (options.invert ? [scale.low, middle, scale.high] : [scale.high, middle, scale.low]).map((value) => ({
    y: yOf(value),
    value,
  }));

  return { line, area, dots, levels };
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Label steps for times, in milliseconds: tenths of a second up to an hour. */
export const TIME_STEPS: readonly number[] = [
  100, 200, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000, 600_000, 900_000, 1_800_000,
  3_600_000,
];
