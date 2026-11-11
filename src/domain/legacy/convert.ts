import { isDay } from '../dates';
import { parseClock } from '../duration';
import { NO_MEASURES, type Measures, type WorkoutEntry } from '../entry';
import {
  BENCH_PRESS,
  customExercise,
  DIPS,
  PULLUPS,
  PUSHUPS,
  roundMetres,
  RUN,
  SHUTTLE,
  SPRINT,
  type Exercise,
  type ExerciseKind,
} from '../exercises';

import {
  isBareClock,
  isUsedUp,
  normalise,
  numberWithUnit,
  takeBracketedClock,
  takeKilometres,
  takeLoadKg,
  takeLoadWithUnitKg,
  takeMetres,
  takeNumber,
  takeRaceTime,
  takeShuttleScheme,
  trailingDistance,
  type ShuttleScheme,
  type Taken,
} from './parse';

/** A workout document as the Record web app stored it. */
export type LegacyWorkout = {
  id?: string | null;
  exercise: string;
  count: string;
  date: string;
  note?: string | null;
  videoUrl?: string | null;
  resultUrl?: string | null;
  createdAt?: number | null;
};

/** Something about a converted entry the person may want to look at. */
export type ConversionIssue =
  /** No numbers could be read, so the entry is not ranked. The original wording is shown. */
  | 'keptAsText'
  /**
   * The numbers were read, but the text says more than they hold ("12+10+8", "24:30 (5 км) у
   * дощ"). The original wording is kept and shown; the numbers are used for ranking.
   */
  | 'looselyRead'
  /** A run or sprint without a distance. It is kept, but belongs to no distance. */
  | 'distanceMissing'
  /** An old shuttle run without a scheme. Record showed those as 10 x 10 m, so that is used. */
  | 'schemeAssumed'
  /** A bench press written as a weight only ("100 кг"), taken to be a single rep. */
  | 'singleRepAssumed';

export type ConvertedEntry = {
  entry: WorkoutEntry;
  /** The original strings, kept so a wrong reading can be traced and fixed. */
  source: { exercise: string; count: string };
  issues: ConversionIssue[];
};

export type SkippedWorkout = {
  workout: LegacyWorkout;
  reason: 'badDate' | 'emptyResult';
};

export type Conversion = {
  /** The person's own exercises that the entries refer to. Built-in ones are not listed. */
  exercises: Exercise[];
  entries: ConvertedEntry[];
  /** Documents that could not be turned into entries at all. */
  skipped: SkippedWorkout[];
};

export type ConvertOptions = {
  /** Makes an id for a document that has none. */
  newId: () => string;
};

/** Old shuttle runs carried no scheme; Record labelled them "10×10м (старі)". */
const ASSUMED_SHUTTLE: ShuttleScheme = { segments: 10, segmentM: 10 };

const CLASSICS = new Map<string, Exercise>([
  ['Підтягування', PULLUPS],
  ['Відтискання', PUSHUPS],
  ['Бруси', DIPS],
]);

const BENCH_PRESS_NAME = 'жим лежачи';

/** The names Record's own form gave to runs, sprints and shuttle runs, with or without a distance. */
const RUN_NAME = /^Біг(\s+[\d.]+\s*км)?$/i;
const SPRINT_NAME = /^Спринт(\s+[\d.]+\s*м)?$/i;
const SHUTTLE_NAME = /^Човниковий біг(\s+\d+\s*[×xхXХ*]\s*\d+(\.\d+)?\s*м?)?$/i;

/** Any name Record timed against the clock, including ones typed by hand ("Біг по сходах"). */
const TIMED_NAME = /^(Біг|Спринт|Човниковий біг)(\s|$)/;

/** When a custom exercise was logged in several shapes equally often, the more structured one wins. */
const KIND_PRIORITY: readonly ExerciseKind[] = ['distanceTime', 'duration', 'bodyweight', 'count'];

type Reading = {
  measures: Measures;
  issues: ConversionIssue[];
};

type BuiltInReading = Reading & { exercise: Exercise };

type CustomReading = Reading & {
  name: string;
  kind: ExerciseKind;
  unit: string | null;
  distanceUnit: 'km' | 'm' | null;
};

type Pending = {
  workout: LegacyWorkout;
  raw: string;
  reading: BuiltInReading | CustomReading;
};

/**
 * Turns Record's workout documents into entries with real numbers. Nothing is thrown away
 * silently: what cannot be read is kept as text and flagged, what cannot be kept is listed in
 * `skipped`.
 */
export function convertLegacyWorkouts(workouts: readonly LegacyWorkout[], options: ConvertOptions): Conversion {
  const skipped: SkippedWorkout[] = [];
  const pending: Pending[] = [];

  for (const workout of workouts) {
    const exerciseName = String(workout.exercise ?? '').trim();
    const raw = String(workout.count ?? '').trim();

    if (!isDay(workout.date)) {
      skipped.push({ workout, reason: 'badDate' });
    } else if (raw === '' || exerciseName === '') {
      skipped.push({ workout, reason: 'emptyResult' });
    } else {
      pending.push({ workout, raw, reading: read(exerciseName, raw) });
    }
  }

  const customExercises = settleCustomExercises(pending.map((item) => item.reading).filter(isCustom));

  const entries = pending.map(({ workout, raw, reading }): ConvertedEntry => {
    const resolved = isCustom(reading) ? fitToExercise(reading, raw, customExercises) : reading;
    return {
      entry: {
        id: workout.id || options.newId(),
        exerciseId: resolved.exercise.id,
        date: workout.date,
        createdAt: isMoment(workout.createdAt) ? workout.createdAt : middayOf(workout.date),
        ...resolved.measures,
        note: String(workout.note ?? ''),
        videoUrl: String(workout.videoUrl ?? ''),
        resultUrl: String(workout.resultUrl ?? ''),
      },
      source: { exercise: workout.exercise, count: workout.count },
      issues: resolved.issues,
    };
  });

  return { exercises: [...customExercises.values()], entries, skipped };
}

function isCustom(reading: BuiltInReading | CustomReading): reading is CustomReading {
  return 'kind' in reading;
}

function isMoment(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function read(exerciseName: string, raw: string): BuiltInReading | CustomReading {
  const count = normalise(raw);
  const name = normalise(exerciseName);

  const classic = CLASSICS.get(exerciseName);
  if (classic) return { exercise: classic, ...readReps(count, raw) };

  if (RUN_NAME.test(name)) return { exercise: RUN, ...readRace(takeKilometres, name, count, raw) };
  if (SPRINT_NAME.test(name)) return { exercise: SPRINT, ...readRace(takeMetres, name, count, raw) };
  if (SHUTTLE_NAME.test(name)) return { exercise: SHUTTLE, ...readShuttle(name, count, raw) };

  if (name.toLowerCase() === BENCH_PRESS_NAME) return { exercise: BENCH_PRESS, ...readBenchPress(count, raw) };

  return readCustom(exerciseName, count, raw);
}

/** A result no numbers could be read from. */
function unread(raw: string): Reading {
  return { measures: { ...NO_MEASURES, text: raw }, issues: ['keptAsText'] };
}

/**
 * Finishes a reading. `complete` says whether the numbers hold everything the string said;
 * if they do not, the original wording is kept next to them.
 */
function understood(measures: Measures, complete: boolean, raw: string, issues: ConversionIssue[] = []): Reading {
  return complete
    ? { measures, issues }
    : { measures: { ...measures, text: raw }, issues: [...issues, 'looselyRead'] };
}

/** "12", "12 (+20 кг)", "12 (0:41)", "12 (+20 кг) (0:41)". */
function readReps(count: string, raw: string): Reading {
  const reps = takeNumber(count);
  if (!reps) return unread(raw);

  const load = takeLoadKg(reps.rest);
  const time = takeBracketedClock((load ?? reps).rest);

  return understood(
    { ...NO_MEASURES, reps: reps.value, loadKg: load?.value ?? null, durationMs: time?.value ?? null },
    isUsedUp((time ?? load ?? reps).rest),
    raw,
  );
}

/**
 * A run or a sprint: a time, with the distance taken from the exercise name ("Біг 5 км") or,
 * in old entries, from the result itself ("5 км (25:00)").
 */
function readRace(
  takeDistance: (text: string) => Taken<number> | null,
  name: string,
  count: string,
  raw: string,
): Reading {
  const time = takeRaceTime(count);
  if (!time) return unread(raw);

  const named = takeDistance(name)?.value ?? null;
  const written = takeDistance(time.rest);
  const distanceM = named ?? written?.value ?? null;
  // The exercise name decides the distance. A result that names another one is kept as written.
  const agree = named === null || written === null || roundMetres(named) === roundMetres(written.value);

  return understood(
    { ...NO_MEASURES, durationMs: time.value, distanceM: distanceM === null ? null : roundMetres(distanceM) },
    agree && isUsedUp((written ?? time).rest),
    raw,
    distanceM === null ? ['distanceMissing'] : [],
  );
}

function readShuttle(name: string, count: string, raw: string): Reading {
  const time = takeRaceTime(count);
  if (!time) return unread(raw);

  const named = takeShuttleScheme(name)?.value ?? null;
  const written = takeShuttleScheme(time.rest);
  const scheme = named ?? written?.value ?? null;
  const agree =
    named === null ||
    written === null ||
    (named.segments === written.value.segments && roundMetres(named.segmentM) === roundMetres(written.value.segmentM));

  const { segments, segmentM } = scheme ?? ASSUMED_SHUTTLE;
  return understood(
    { ...NO_MEASURES, durationMs: time.value, segments, distanceM: roundMetres(segmentM) },
    agree && isUsedUp((written ?? time).rest),
    raw,
    scheme === null ? ['schemeAssumed'] : [],
  );
}

/**
 * "5 (+100 кг)" is five reps with 100 kg; a bare "100 кг" is taken as one rep. Anything else
 * is kept as text: guessing which number is the weight would put wrong records on the bar.
 */
function readBenchPress(count: string, raw: string): Reading {
  const reps = takeNumber(count);
  const load = reps ? takeLoadWithUnitKg(reps.rest) : null;
  if (reps && load) {
    return understood({ ...NO_MEASURES, reps: reps.value, loadKg: load.value }, isUsedUp(load.rest), raw);
  }

  const plain = numberWithUnit(count);
  if (plain && (plain.unit === null || /^(кг|kg)$/i.test(plain.unit))) {
    return { measures: { ...NO_MEASURES, reps: 1, loadKg: plain.value }, issues: ['singleRepAssumed'] };
  }

  return unread(raw);
}

/** Works out what kind of result a custom exercise entry is from the shape of its text. */
function readCustom(exerciseName: string, count: string, raw: string): CustomReading {
  const base = { name: exerciseName, unit: null, distanceUnit: null, issues: [] };

  // "12:30": a time on its own; with a distance in the exercise name, a distance against the clock.
  if (isBareClock(count)) {
    const durationMs = parseClock(count);
    const distance = trailingDistance(exerciseName);
    if (distance) {
      return {
        ...base,
        name: distance.baseName,
        kind: 'distanceTime',
        distanceUnit: distance.unit,
        measures: { ...NO_MEASURES, durationMs, distanceM: roundMetres(distance.distanceM) },
      };
    }
    return { ...base, kind: 'duration', measures: { ...NO_MEASURES, durationMs } };
  }

  // A hand-typed name that Record still timed against the clock: "Біг по сходах".
  if (TIMED_NAME.test(exerciseName)) {
    const time = takeRaceTime(count);
    if (time) {
      const measures = { ...NO_MEASURES, durationMs: time.value };
      return { ...base, kind: 'duration', ...understood(measures, isUsedUp(time.rest), raw) };
    }
  }

  const number = takeNumber(count);
  const load = number ? takeLoadKg(number.rest) : null;
  const time = number ? takeBracketedClock((load ?? number).rest) : null;

  // "10 (+50 кг)": reps with extra load, as Record ranked them.
  if (number && load) {
    const measures = { ...NO_MEASURES, reps: number.value, loadKg: load.value, durationMs: time?.value ?? null };
    return { ...base, kind: 'bodyweight', ...understood(measures, isUsedUp((time ?? load).rest), raw) };
  }

  // "50 (0:41.2)": a number and a time. The number is what is ranked, as in Record.
  if (number && time && isUsedUp(time.rest)) {
    return { ...base, kind: 'count', measures: { ...NO_MEASURES, value: number.value, durationMs: time.value } };
  }

  // "100 кг", "50".
  const plain = numberWithUnit(count);
  if (plain) {
    return { ...base, kind: 'count', unit: plain.unit, measures: { ...NO_MEASURES, value: plain.value } };
  }

  return { ...base, kind: 'text', measures: { ...NO_MEASURES, text: raw } };
}

function customId(name: string): string {
  return `custom:${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

const sameUnit = (a: string, b: string) => a.toLowerCase().replace(/\.$/, '') === b.toLowerCase().replace(/\.$/, '');

/**
 * An exercise has one kind, but in Record the same name could be logged in different shapes.
 * Each custom exercise takes the kind most of its entries have.
 */
function settleCustomExercises(readings: readonly CustomReading[]): Map<string, Exercise> {
  const groups = new Map<string, CustomReading[]>();
  for (const reading of readings) {
    const id = customId(reading.name);
    groups.set(id, [...(groups.get(id) ?? []), reading]);
  }

  const exercises = new Map<string, Exercise>();
  for (const [id, group] of groups) {
    const kind = settleKind(group);
    const ofKind = group.filter((reading) => reading.kind === kind);
    const units = ofKind.map((reading) => reading.unit).filter((unit): unit is string => unit !== null);

    exercises.set(
      id,
      customExercise({
        id,
        name: group[0]?.name ?? id,
        kind,
        unit: mostCommon(units, units, sameUnit) ?? null,
        distanceUnit: ofKind[0]?.distanceUnit ?? null,
      }),
    );
  }

  return exercises;
}

function settleKind(group: readonly CustomReading[]): ExerciseKind {
  const numeric = group.filter((reading) => reading.kind !== 'text');
  if (numeric.length < group.length - numeric.length) return 'text';

  // Reps with an optional extra load: the plain numbers among them are sets without one.
  const hasLoadedSets = numeric.some((reading) => reading.kind === 'bodyweight');
  const restArePlain = numeric.every(
    (reading) => reading.kind === 'bodyweight' || (reading.kind === 'count' && reading.unit === null),
  );
  if (hasLoadedSets && restArePlain) return 'bodyweight';

  return mostCommon(numeric.map((reading) => reading.kind), KIND_PRIORITY) ?? 'text';
}

/** Fits one reading to the kind its exercise ended up with; what does not fit is kept as text. */
function fitToExercise(reading: CustomReading, raw: string, exercises: Map<string, Exercise>): BuiltInReading {
  const exercise = exercises.get(customId(reading.name));
  if (!exercise) {
    throw new Error(`No exercise was settled for "${reading.name}"`);
  }

  const { measures, issues } = reading;
  const asText = (flag: ConversionIssue[]): BuiltInReading => ({
    exercise,
    measures: { ...NO_MEASURES, text: raw },
    issues: flag,
  });

  // In an exercise of words every result is shown as it was written.
  if (exercise.kind === 'text') return asText([]);

  if (reading.kind === exercise.kind) {
    // "5 разів" among results in kilograms is not the same measurement.
    const otherUnit = reading.unit !== null && exercise.unit !== null && !sameUnit(reading.unit, exercise.unit);
    return otherUnit ? asText(['keptAsText']) : { exercise, measures, issues };
  }

  // A plain "12" among "12 (+20 кг)" entries is a set without extra load.
  if (exercise.kind === 'bodyweight' && reading.kind === 'count' && reading.unit === null) {
    return { exercise, measures: { ...NO_MEASURES, reps: measures.value, durationMs: measures.durationMs }, issues };
  }

  // A time without a distance among results over a distance.
  if (exercise.kind === 'distanceTime' && reading.kind === 'duration') {
    return { exercise, measures, issues: [...issues, 'distanceMissing'] };
  }

  return asText(['keptAsText']);
}

/**
 * The item that occurs most often. Ties go to whichever comes first in `preference`.
 * `undefined` for an empty list.
 */
function mostCommon<T>(
  items: readonly T[],
  preference: readonly T[],
  same: (a: T, b: T) => boolean = (a, b) => a === b,
): T | undefined {
  const tally: { item: T; count: number }[] = [];
  for (const item of items) {
    const seen = tally.find((entry) => same(entry.item, item));
    if (seen) seen.count += 1;
    else tally.push({ item, count: 1 });
  }

  const rank = (item: T) => {
    const index = preference.findIndex((preferred) => same(preferred, item));
    return index < 0 ? preference.length : index;
  };

  return tally.sort((a, b) => b.count - a.count || rank(a.item) - rank(b.item))[0]?.item;
}

/** Old documents have no creation time. Midday keeps them out of "written at night". */
function middayOf(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1, 12).getTime();
}
