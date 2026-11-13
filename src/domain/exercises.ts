/**
 * What kind of result an exercise produces. It decides which numbers an entry carries and how
 * two entries are compared.
 */
export type ExerciseKind =
  /** Reps with your own body, optionally with extra load and a time: pull-ups. */
  | 'bodyweight'
  /** An external load lifted for reps: bench press. */
  | 'weight'
  /** A set distance against the clock: a 5 km run. */
  | 'distanceTime'
  /** Back-and-forth segments against the clock: 4 x 9 m. */
  | 'shuttle'
  /** A time on its own: a hold, or a timed test. */
  | 'duration'
  /** A number with any unit the person likes. */
  | 'count'
  /** Free text. Kept and shown, never compared. */
  | 'text';

export type Direction = 'higher' | 'lower';

export type Exercise = {
  id: string;
  kind: ExerciseKind;
  /** Which way is better. `null` for results that cannot be compared. */
  better: Direction | null;
  builtIn: boolean;
  /** The name a person gave their own exercise. Built-in ones are named by translations. */
  name: string | null;
  /** Unit of a `count` result, as typed: "kg", "разів". */
  unit: string | null;
  /** Whether this exercise's distances read better in kilometres or in metres. */
  distanceUnit: 'km' | 'm' | null;
};

function builtIn(id: string, kind: ExerciseKind, better: Direction, distanceUnit: 'km' | 'm' | null = null): Exercise {
  return { id, kind, better, builtIn: true, name: null, unit: null, distanceUnit };
}

export const PULLUPS = builtIn('pullups', 'bodyweight', 'higher');
export const PUSHUPS = builtIn('pushups', 'bodyweight', 'higher');
export const DIPS = builtIn('dips', 'bodyweight', 'higher');
export const BENCH_PRESS = builtIn('benchPress', 'weight', 'higher');
export const RUN = builtIn('run', 'distanceTime', 'lower', 'km');
export const SPRINT = builtIn('sprint', 'distanceTime', 'lower', 'm');
export const SHUTTLE = builtIn('shuttle', 'shuttle', 'lower', 'm');

/** In the order they are offered when logging a result. */
export const BUILT_IN_EXERCISES: readonly Exercise[] = [PULLUPS, PUSHUPS, DIPS, BENCH_PRESS, RUN, SPRINT, SHUTTLE];

export type BuiltInExerciseId = 'pullups' | 'pushups' | 'dips' | 'benchPress' | 'run' | 'sprint' | 'shuttle';

/** The three exercises Record tracks rep totals and a one-rep max for. */
export const BODYWEIGHT_CLASSICS: readonly Exercise[] = [PULLUPS, PUSHUPS, DIPS];

const DEFAULT_DIRECTION: Record<ExerciseKind, Direction | null> = {
  bodyweight: 'higher',
  weight: 'higher',
  distanceTime: 'lower',
  shuttle: 'lower',
  // Record treats a bare time as a race against the clock, so that is the default here too.
  duration: 'lower',
  count: 'higher',
  text: null,
};

/** Every kind there is, for checking stored values and for pickers. */
export const EXERCISE_KINDS = Object.keys(DEFAULT_DIRECTION) as ExerciseKind[];

/**
 * Whether the person picks which way is better. Only a bare time or a bare number can go
 * either way: a plank is held as long as possible, a lap is run as fast as possible. The other
 * kinds have one natural direction.
 */
export function choosesDirection(kind: ExerciseKind): boolean {
  return kind === 'duration' || kind === 'count';
}

export function isExerciseKind(value: unknown): value is ExerciseKind {
  return typeof value === 'string' && (EXERCISE_KINDS as readonly string[]).includes(value);
}

export type CustomExerciseInput = {
  id: string;
  name: string;
  kind: ExerciseKind;
  better?: Direction;
  unit?: string | null;
  distanceUnit?: 'km' | 'm' | null;
};

/** Describes an exercise the person added themselves. */
export function customExercise(input: CustomExerciseInput): Exercise {
  const usesDistance = input.kind === 'distanceTime' || input.kind === 'shuttle';
  return {
    id: input.id,
    kind: input.kind,
    better: input.kind === 'text' ? null : (input.better ?? DEFAULT_DIRECTION[input.kind]),
    builtIn: false,
    name: input.name.trim(),
    unit: input.kind === 'count' ? (input.unit?.trim() || null) : null,
    distanceUnit: usesDistance ? (input.distanceUnit ?? 'km') : null,
  };
}

/** Looks an exercise up by id; `undefined` when it is unknown or was deleted. */
export type ExerciseLookup = (id: string) => Exercise | undefined;

/** A lookup over the built-in exercises plus any custom ones. */
export function exerciseLookup(custom: readonly Exercise[] = []): ExerciseLookup {
  const byId = new Map([...BUILT_IN_EXERCISES, ...custom].map((exercise) => [exercise.id, exercise]));
  return (id) => byId.get(id);
}

/** Exercises timed against the clock, where the distance is part of what is being measured. */
export function isRace(exercise: Exercise): boolean {
  return exercise.kind === 'distanceTime' || exercise.kind === 'shuttle';
}

/** Whether a result of this exercise is a time: a race, or a time on its own. */
export function isTimed(exercise: Exercise): boolean {
  return isRace(exercise) || exercise.kind === 'duration';
}

/**
 * Records are kept per discipline, not per exercise: a 5 km run and a 3 km run never compete.
 * The key is the exercise id, plus the distance or the shuttle scheme where there is one.
 */
export function disciplineKey(
  exercise: Exercise,
  entry: { distanceM: number | null; segments: number | null },
): string {
  if (exercise.kind === 'distanceTime' && entry.distanceM !== null) {
    return `${exercise.id}@${roundMetres(entry.distanceM)}`;
  }
  if (exercise.kind === 'shuttle' && entry.distanceM !== null && entry.segments !== null) {
    return `${exercise.id}@${entry.segments}x${roundMetres(entry.distanceM)}`;
  }
  return exercise.id;
}

/** Distances are compared to the centimetre, so 0.4 km and 400 m are the same discipline. */
export function roundMetres(metres: number): number {
  return Math.round(metres * 100) / 100;
}

/** What can be changed about one of the person's own exercises once it exists. */
export type ExerciseChanges = {
  name?: string;
  /** Taken only where the kind lets the person choose (`choosesDirection`). */
  better?: Direction;
  /** Taken only for a `count`. Empty means no unit. */
  unit?: string | null;
  /** Taken only for distances against the clock. */
  distanceUnit?: 'km' | 'm';
};

/**
 * An own exercise with the given changes. The id and the kind stay: entries are stored as
 * numbers of that kind, and goals and records are kept under that id. A change that does not
 * apply to the kind is ignored, the way the form to add an exercise ignores it.
 */
export function changeExercise(exercise: Exercise, changes: ExerciseChanges): Exercise {
  if (exercise.builtIn) {
    throw new Error(`"${exercise.id}" is a built-in exercise and cannot be changed`);
  }

  return customExercise({
    id: exercise.id,
    kind: exercise.kind,
    name: changes.name ?? exercise.name ?? '',
    better: (choosesDirection(exercise.kind) ? changes.better : undefined) ?? exercise.better ?? undefined,
    unit: changes.unit === undefined ? exercise.unit : changes.unit,
    distanceUnit: changes.distanceUnit ?? exercise.distanceUnit ?? undefined,
  });
}

