import {
  BUILT_IN_EXERCISES,
  customExercise,
  entryProblems,
  isDay,
  isBuiltInPart,
  isExerciseKind,
  readLook,
  type BodyMeasurement,
  type Exercise,
  type Look,
  type OwnBodyPart,
  type WeightRecord,
  type WorkoutEntry,
} from '@/domain';

/*
 * The backup file: everything a person has entered, as one JSON document.
 *
 * What goes in is what the person can see: results, their own exercises, body weight and
 * measurements with the body parts of their own, goals, the counters' dates, height and the
 * look of the camp. What stays out: language, skin and units (choices about this phone),
 * anything deleted, and what went out of sight with a deleted exercise or body part.
 *
 * Reading is strict. A file is taken whole or not at all: one row that makes no sense means
 * the file was damaged or edited by hand, and half of a history is worse than an honest "no".
 */

export const BACKUP_FORMAT = 'record-backup';
/** Raise when the shape changes in a way an older app could misread. */
export const BACKUP_VERSION = 1;

/** The profile as the backup holds it. Kept apart from the database's type on purpose. */
export type BackupProfile = {
  heightCm: number | null;
  trainingSince: string | null;
  soberSince: string | null;
};

export type BackupData = {
  /** The person's own exercises. Built-in ones are not stored: every version of the app has them. */
  exercises: Exercise[];
  entries: WorkoutEntry[];
  bodyWeights: WeightRecord[];
  bodyMeasurements: BodyMeasurement[];
  /** Body parts of the person's own. A file made before they existed has none. */
  bodyParts: OwnBodyPart[];
  goals: { discipline: string; target: number }[];
  profile: BackupProfile;
  look: Look;
};

export type Backup = BackupData & {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** When the file was made, as an ISO timestamp. */
  exportedAt: string;
  /** The version of the app that made it, for the record. */
  appVersion: string | null;
};

export function buildBackup(data: BackupData, exportedAt: Date, appVersion: string | null): Backup {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), appVersion, ...data };
}

export function serialiseBackup(backup: Backup): string {
  return JSON.stringify(backup);
}

/** `record-backup-2026-11-13.json` */
export function backupFileName(day: string): string {
  return `${BACKUP_FORMAT}-${day}.json`;
}

export type BackupProblem =
  /** Not JSON at all: some other kind of file. */
  | 'notJson'
  /** JSON, but not one of ours. */
  | 'notBackup'
  /** Made by a newer app than this one. */
  | 'newerVersion'
  /** Ours, but something in it makes no sense. `where` says what, for a bug report. */
  | 'damaged';

export type BackupReading =
  | { ok: true; backup: Backup }
  | { ok: false; problem: Exclude<BackupProblem, 'damaged'> }
  | { ok: false; problem: 'damaged'; where: string };

class Damaged extends Error {
  constructor(readonly where: string) {
    super(where);
  }
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isPositive = (value: unknown): value is number => isNumber(value) && value > 0;

function need(ok: boolean, where: string): asserts ok {
  if (!ok) throw new Damaged(where);
}

function list(value: unknown, where: string): unknown[] {
  need(Array.isArray(value), where);
  return value as unknown[];
}

function row(value: unknown, where: string): Json {
  need(isObject(value), where);
  return value as Json;
}

const numberOrNull = (value: unknown, where: string): number | null => {
  need(value === null || value === undefined || isNumber(value), where);
  return (value as number | null | undefined) ?? null;
};

const dayOrNull = (value: unknown, where: string): string | null => {
  need(value === null || value === undefined || isDay(value), where);
  return (value as string | null | undefined) ?? null;
};

const textOr = (value: unknown, fallback: string, where: string): string => {
  need(value === undefined || value === null || isText(value), where);
  return (value as string | null | undefined) ?? fallback;
};

const BUILT_IN_IDS = new Set(BUILT_IN_EXERCISES.map((exercise) => exercise.id));

function readExercise(value: unknown, where: string): Exercise {
  const raw = row(value, where);
  need(isText(raw.id) && raw.id.length > 0 && !BUILT_IN_IDS.has(raw.id), `${where}.id`);
  need(isExerciseKind(raw.kind), `${where}.kind`);
  need(isText(raw.name) && raw.name.trim().length > 0, `${where}.name`);
  need(raw.better === null || raw.better === undefined || raw.better === 'higher' || raw.better === 'lower', `${where}.better`);
  need(raw.unit === null || raw.unit === undefined || isText(raw.unit), `${where}.unit`);
  need(
    raw.distanceUnit === null || raw.distanceUnit === undefined || raw.distanceUnit === 'km' || raw.distanceUnit === 'm',
    `${where}.distanceUnit`,
  );

  // Built the way the app builds its own, so a field that does not belong to the kind is dropped.
  return customExercise({
    id: raw.id,
    name: raw.name,
    kind: raw.kind,
    better: raw.better ?? undefined,
    unit: raw.unit,
    distanceUnit: raw.distanceUnit,
  });
}

function readEntry(value: unknown, exercises: ReadonlyMap<string, Exercise>, where: string): WorkoutEntry {
  const raw = row(value, where);
  need(isText(raw.id) && raw.id.length > 0, `${where}.id`);
  need(isText(raw.exerciseId), `${where}.exerciseId`);
  const exercise = exercises.get(raw.exerciseId);
  need(exercise !== undefined, `${where}.exerciseId`);
  need(isDay(raw.date), `${where}.date`);
  need(isNumber(raw.createdAt), `${where}.createdAt`);
  need(raw.text === null || raw.text === undefined || isText(raw.text), `${where}.text`);

  const entry: WorkoutEntry = {
    id: raw.id,
    exerciseId: raw.exerciseId,
    date: raw.date,
    createdAt: raw.createdAt,
    reps: numberOrNull(raw.reps, `${where}.reps`),
    loadKg: numberOrNull(raw.loadKg, `${where}.loadKg`),
    durationMs: numberOrNull(raw.durationMs, `${where}.durationMs`),
    distanceM: numberOrNull(raw.distanceM, `${where}.distanceM`),
    segments: numberOrNull(raw.segments, `${where}.segments`),
    value: numberOrNull(raw.value, `${where}.value`),
    text: raw.text ?? null,
    note: textOr(raw.note, '', `${where}.note`),
    videoUrl: textOr(raw.videoUrl, '', `${where}.videoUrl`),
    resultUrl: textOr(raw.resultUrl, '', `${where}.resultUrl`),
  };
  // The same check the logging form makes: an entry the app could not have saved is damage.
  need(entryProblems(entry, exercise).length === 0, where);

  return entry;
}

function readProfile(value: unknown, where: string): BackupProfile {
  if (value === undefined || value === null) return { heightCm: null, trainingSince: null, soberSince: null };
  const raw = row(value, where);
  const heightCm = numberOrNull(raw.heightCm, `${where}.heightCm`);
  need(heightCm === null || heightCm > 0, `${where}.heightCm`);

  return {
    heightCm,
    trainingSince: dayOrNull(raw.trainingSince, `${where}.trainingSince`),
    soberSince: dayOrNull(raw.soberSince, `${where}.soberSince`),
  };
}

/** Rows that share a key: the later one stands, as it would if they were saved one by one. */
function lastByKey<Row>(rows: Row[], key: (row: Row) => string): Row[] {
  return [...new Map(rows.map((item) => [key(item), item])).values()];
}

function readData(raw: Json): BackupData {
  const exercises = list(raw.exercises ?? [], 'exercises').map((item, index) => readExercise(item, `exercises[${index}]`));
  need(new Set(exercises.map((exercise) => exercise.id)).size === exercises.length, 'exercises');

  const known = new Map([...BUILT_IN_EXERCISES, ...exercises].map((exercise) => [exercise.id, exercise]));
  const entries = list(raw.entries ?? [], 'entries').map((item, index) => readEntry(item, known, `entries[${index}]`));
  need(new Set(entries.map((entry) => entry.id)).size === entries.length, 'entries');

  const bodyWeights = list(raw.bodyWeights ?? [], 'bodyWeights').map((item, index) => {
    const where = `bodyWeights[${index}]`;
    const record = row(item, where);
    need(isDay(record.date), `${where}.date`);
    need(isPositive(record.kg), `${where}.kg`);
    return { date: record.date, kg: record.kg };
  });

  const bodyMeasurements = list(raw.bodyMeasurements ?? [], 'bodyMeasurements').map((item, index) => {
    const where = `bodyMeasurements[${index}]`;
    const record = row(item, where);
    need(isDay(record.date), `${where}.date`);
    need(isText(record.part) && record.part.trim().length > 0, `${where}.part`);
    need(isPositive(record.cm), `${where}.cm`);
    return { date: record.date, part: record.part, cm: record.cm };
  });

  const bodyParts = list(raw.bodyParts ?? [], 'bodyParts').map((item, index) => {
    const where = `bodyParts[${index}]`;
    const record = row(item, where);
    need(isText(record.id) && record.id.length > 0 && !isBuiltInPart(record.id), `${where}.id`);
    need(isText(record.name) && record.name.trim().length > 0, `${where}.name`);
    return { id: record.id, name: record.name.trim() };
  });
  need(new Set(bodyParts.map((part) => part.id)).size === bodyParts.length, 'bodyParts');

  const goals = list(raw.goals ?? [], 'goals').map((item, index) => {
    const where = `goals[${index}]`;
    const record = row(item, where);
    need(isText(record.discipline) && record.discipline.length > 0, `${where}.discipline`);
    need(isPositive(record.target), `${where}.target`);
    return { discipline: record.discipline, target: record.target };
  });

  return {
    exercises,
    entries,
    bodyWeights: lastByKey(bodyWeights, (record) => record.date),
    bodyMeasurements: lastByKey(bodyMeasurements, (record) => `${record.date} ${record.part}`),
    bodyParts,
    goals: lastByKey(goals, (goal) => goal.discipline),
    profile: readProfile(raw.profile, 'profile'),
    // The look is read the forgiving way it is read from the database: an item this version
    // does not offer becomes the starting one instead of spoiling the whole file.
    look: readLook(isObject(raw.look) ? raw.look : {}),
  };
}

/** Reads the text of a backup file. */
export function readBackup(text: string): BackupReading {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'notJson' };
  }

  if (!isObject(raw) || raw.format !== BACKUP_FORMAT || !isNumber(raw.version) || raw.version < 1) {
    return { ok: false, problem: 'notBackup' };
  }
  if (raw.version > BACKUP_VERSION) {
    return { ok: false, problem: 'newerVersion' };
  }

  try {
    need(isText(raw.exportedAt) && !Number.isNaN(Date.parse(raw.exportedAt)), 'exportedAt');
    return {
      ok: true,
      backup: {
        format: BACKUP_FORMAT,
        version: raw.version,
        exportedAt: raw.exportedAt,
        appVersion: isText(raw.appVersion) ? raw.appVersion : null,
        ...readData(raw),
      },
    };
  } catch (error) {
    if (error instanceof Damaged) return { ok: false, problem: 'damaged', where: error.where };
    throw error;
  }
}
