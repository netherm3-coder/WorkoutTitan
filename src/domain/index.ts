/**
 * The rules of Record: what a result is, how results are ranked and what is worked out from
 * them. Plain functions over plain data; nothing here touches the screen, the database or
 * the clock.
 */

export * from './achievements';
export * from './bodyWeight';
export * from './counters';
export * from './dates';
export * from './duration';
export * from './entry';
export * from './exercises';
export * from './goals';
export * from './history';
export * from './pedestal';
export * from './score';
export * from './status';
export * from './strength';
export * from './totals';
export {
  convertLegacyWorkouts,
  type Conversion,
  type ConversionIssue,
  type ConvertedEntry,
  type ConvertOptions,
  type LegacyWorkout,
  type SkippedWorkout,
} from './legacy/convert';
