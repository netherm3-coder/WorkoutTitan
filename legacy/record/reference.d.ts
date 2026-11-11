/** Types for `reference.js`, the copy of Record's calculation code that tests compare against. */

declare function createRecordReference(
  allWeights?: readonly createRecordReference.Weight[],
): createRecordReference.Reference;

declare namespace createRecordReference {
  /** A weigh-in as Record keeps it. The list is newest first. */
  type Weight = { date: string; weight: number };

  /** A workout document. `count` is the result as text. */
  type Workout = { id?: string | null; exercise: string; count: string; date: string; createdAt?: number | null };

  type PedestalEntry = {
    count: string;
    date: string;
    index: number;
    /** Most reps ever for strength exercises; the best time in seconds for running ones. */
    absoluteMaxReps: number;
    max1RM: number;
  };

  type Status = {
    level: string;
    coef: number;
    percent: number;
    nextLevel: string | null;
    kg: number | null;
    best: { rel: number; reps: number; added: number; date: string };
  };

  type Reference = {
    EX: Record<'PULLUPS' | 'PUSHUPS' | 'DIPS' | 'RUN' | 'SPRINT' | 'SHUTTLE' | 'CUSTOM', string>;
    STRENGTH_1RM_EX: string[];
    STATUS_DAYS: number;
    STATUS_LEVELS: { name: string; from: number; to: number; color: string }[];

    parseValue(text: unknown): number;
    isRunningExercise(exercise: string): boolean;
    parseTimeFromCount(count: string): number;
    parseDistFromCount(count: string): number;
    migrateWorkout<T extends { exercise: string; count: string }>(workout: T): T;
    getWeightAtDate(date?: string): number;
    getStatUpdateData(exercise: string, count: string): { key: string; val: number };
    calculateIndex(count: string, date: string, exercise?: string): number;
    rmFactor(reps: number): number;
    calculate1RM(count: string, date: string): number;
    _parenTime(text: string): number;
    _hasDualMetric(count: string): boolean;
    _looksLikeTime(text: string): boolean;
    _pedestalEntryFrom(list: readonly Workout[], exercise: string): PedestalEntry | null;

    totalKm(workouts: readonly Workout[]): number;
    /** `Infinity` when the exercise has no timed result. */
    bestSecFor(workouts: readonly Workout[], exercise: string): number;
    customExCount(workouts: readonly Workout[]): number;
    maxWeightFor(workouts: readonly Workout[], exercise: string): number;
    calculateStreak(workouts: readonly Workout[]): number;
    maxRecordsInMonth(workouts: readonly Workout[]): number;
    spanInMonths(workouts: readonly Workout[]): number;
    hasComeback(workouts: readonly Workout[]): boolean;
    hasImprovement(workouts: readonly Workout[]): boolean;
    maxImprovements(workouts: readonly Workout[]): number;
    maxRecordsPerExercise(workouts: readonly Workout[]): number;

    /** Adapted. `allWorkouts` is newest first. */
    personalBestIds(allWorkouts: readonly (Workout & { id: string })[]): Set<string>;
    /** Adapted. `null` where Record shows a hint instead of a rank. Reads the current date. */
    sportStatus(source: readonly Workout[]): Status | null;
    /** Adapted. Goals for running exercises are in seconds. */
    goalPercent(exercise: string, pedestalEntry: Pick<PedestalEntry, 'count' | 'absoluteMaxReps'>, goal: number | string): number;
    /** Adapted. Both dates at local midnight. */
    elapsedSince(startDate: Date, today: Date): { years: number; months: number; days: number; total: number };
  };
}

export = createRecordReference;
