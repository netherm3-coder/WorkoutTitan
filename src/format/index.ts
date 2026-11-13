/** Turning numbers, days and results into the text a person reads, and typed text back into numbers. */

export { formatLength, formatWeight, lengthField, weightField } from './amounts';
export { formatDay, formatElapsed } from './dates';
export { formatNumber, parseDecimal, roundTo } from './numbers';
export { disciplineName, exerciseKind, exerciseName, formatGoal, formatResult } from './results';
export { formatDuration, joinDuration, splitDuration } from './time';
export {
  CM_PER_IN,
  decimalsOf,
  defaultUnits,
  isLengthUnit,
  isWeightUnit,
  KG_PER_LB,
  LENGTH_UNITS,
  lengthFrom,
  lengthIn,
  METRIC,
  US_UNITS,
  WEIGHT_UNITS,
  weightFrom,
  weightIn,
  type LengthUnit,
  type Units,
  type WeightUnit,
} from './units';
export { UnitsProvider, useUnits, type UnitsProviderProps } from './UnitsProvider';
export { useFormat } from './useFormat';
