/*
 * Units a person reads and types in. Everything is stored in kilograms, centimetres, metres
 * and milliseconds whatever is chosen here: units change what a screen shows and how a typed
 * number is read, never what is kept.
 *
 * Distances are not converted. The running disciplines are race distances (1 km, 5 km, the
 * marathon), and a run typed in miles would land beside them rather than on them: 3.1 miles is
 * 4989 m, not 5 km.
 */

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const LENGTH_UNITS = ['cm', 'in'] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

/** Weights are lifts and body weight; lengths are body measurements and height. */
export type Units = { weight: WeightUnit; length: LengthUnit };

export const METRIC: Units = { weight: 'kg', length: 'cm' };
export const US_UNITS: Units = { weight: 'lb', length: 'in' };

/** Exact by definition. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const isWeightUnit = (value: unknown): value is WeightUnit => (WEIGHT_UNITS as readonly unknown[]).includes(value);
export const isLengthUnit = (value: unknown): value is LengthUnit => (LENGTH_UNITS as readonly unknown[]).includes(value);

/** A stored weight in the chosen unit. */
export function weightIn(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

/** A typed weight back in kilograms. */
export function weightFrom(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** A stored length in the chosen unit. */
export function lengthIn(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_IN;
}

/** A typed length back in centimetres. */
export function lengthFrom(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_IN;
}

/**
 * How many decimals a value in this unit is shown with. Kilograms keep two (1.25 kg plates);
 * pounds and inches one, which is how they are weighed and measured, and which hides the long
 * tails a conversion leaves.
 */
export function decimalsOf(unit: WeightUnit | LengthUnit): number {
  return unit === 'kg' || unit === 'cm' ? 2 : 1;
}

/**
 * Units for a phone where nobody chose yet: pounds and inches where the system says it uses the
 * US system, the metric ones everywhere else. Britain counts as metric here: its gyms weigh in
 * kilograms.
 */
export function defaultUnits(locales: readonly { measurementSystem?: string | null }[]): Units {
  return locales[0]?.measurementSystem === 'us' ? US_UNITS : METRIC;
}
