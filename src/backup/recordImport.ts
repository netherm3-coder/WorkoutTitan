import type { Conversion, ConversionIssue, Exercise, WorkoutEntry } from '@/domain';

/*
 * Fits a converted Record history to what the phone already has, without touching either.
 *
 * Unlike a backup, this never replaces anything. Record's file can be brought in again after
 * more results were logged there, and what was already brought in (and perhaps corrected or
 * deleted since) must stay as the person left it. So only the rows the phone has never seen
 * are added.
 */

export type RecordImport = {
  /** Own exercises to create. */
  exercises: Exercise[];
  /** Entries to add: the ones this phone has never had. */
  entries: WorkoutEntry[];
  /** Rows of the file that were brought in before. */
  alreadyHere: number;
  /** How many of the entries to add carry each flag. */
  issues: Record<ConversionIssue, number>;
  /** The original wording of new entries that could not be read as numbers. */
  keptAsText: { exercise: string; count: string }[];
};

/** Own exercises always have a name; built-in ones (named by translation) never get here. */
const sameName = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/**
 * @param ownExercises the own exercises on the phone, as shown (not the deleted ones)
 * @param knownEntryIds every entry id the phone has ever had, deleted ones included
 * @param nameFromRecord gives a second name to an exercise that clashes with one on the phone
 */
export function fitRecordImport(
  conversion: Conversion,
  ownExercises: readonly Exercise[],
  knownEntryIds: ReadonlySet<string>,
  nameFromRecord: (name: string) => string,
): RecordImport {
  const exercises: Exercise[] = [];
  const renamed = new Map<string, string>();

  for (const exercise of conversion.exercises) {
    if (ownExercises.some((own) => own.id === exercise.id)) continue;

    const namesake = ownExercises.find((own) => sameName(own.name, exercise.name));
    if (!namesake) {
      exercises.push(exercise);
    } else if (namesake.kind === exercise.kind) {
      // The person already made this exercise by hand: the old results join it.
      renamed.set(exercise.id, namesake.id);
    } else {
      // Same name, different measure: results in kilograms cannot join results in minutes.
      exercises.push({ ...exercise, name: nameFromRecord(exercise.name ?? '') });
    }
  }

  const issues: RecordImport['issues'] = {
    keptAsText: 0,
    looselyRead: 0,
    distanceMissing: 0,
    schemeAssumed: 0,
    singleRepAssumed: 0,
  };
  const entries: WorkoutEntry[] = [];
  const keptAsText: RecordImport['keptAsText'] = [];
  let alreadyHere = 0;

  for (const converted of conversion.entries) {
    if (knownEntryIds.has(converted.entry.id)) {
      alreadyHere += 1;
      continue;
    }
    entries.push({ ...converted.entry, exerciseId: renamed.get(converted.entry.exerciseId) ?? converted.entry.exerciseId });
    for (const issue of converted.issues) issues[issue] += 1;
    if (converted.issues.includes('keptAsText')) keptAsText.push(converted.source);
  }

  // An exercise all of whose rows are here already has nothing new to bring.
  const used = new Set(entries.map((entry) => entry.exerciseId));
  return { exercises: exercises.filter((exercise) => used.has(exercise.id)), entries, alreadyHere, issues, keptAsText };
}
