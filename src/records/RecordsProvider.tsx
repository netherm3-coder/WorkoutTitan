import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { BackupData } from '@/backup/format';
import type { RecordImport } from '@/backup/recordImport';
import {
  addEntry as insertEntry,
  clearGoal as removeGoal,
  deleteBodyPart as markBodyPartDeleted,
  deleteBodyWeight as markWeightDeleted,
  deleteEntry as markDeleted,
  deleteExercise as markExerciseDeleted,
  importRecord as writeRecordImport,
  listBodyMeasurements,
  listBodyParts,
  listDeletedBodyParts,
  listDeletedExercises,
  listExercises,
  listGoals,
  loadHistory,
  loadLook,
  loadProfile,
  newId,
  restoreBackup as writeBackup,
  restoreBodyPart as reviveBodyPart,
  restoreEntry,
  restoreExercise as reviveExercise,
  saveBodyMeasurements as writeMeasurements,
  saveBodyPart as writeBodyPart,
  saveBodyWeight as writeWeight,
  saveExercise as writeExercise,
  saveLook as writeLook,
  saveProfile as writeProfile,
  setGoal as writeGoal,
  updateEntry as replaceEntry,
  useDatabase,
  type Database,
  type DeletedBodyPart,
  type DeletedExercise,
  type Profile,
} from '@/db';
import {
  BUILT_IN_EXERCISES,
  type BodyMeasurement,
  type Day,
  type Exercise,
  type History,
  type Look,
  type Measures,
  type OwnBodyPart,
  type WeightRecord,
  type WorkoutEntry,
} from '@/domain';

/** What the form hands over for a new entry; the id and the moment of writing are added here. */
export type NewEntry = Measures & { exerciseId: string; date: Day; note: string };

export type Records = {
  /** Everything recorded so far. A new object after every change. */
  history: History;
  /** Every exercise a result can be logged for: the built-in ones, then the person's own. */
  exercises: readonly Exercise[];
  /** Tape measurements, oldest day first. Weigh-ins are part of the history. */
  measurements: readonly BodyMeasurement[];
  /** Goals by discipline, in the number the discipline is measured by. */
  goals: ReadonlyMap<string, number>;
  profile: Profile;
  /** The look chosen for the camp. What is drawn is this with the closed items put back (`wearable`). */
  look: Look;
  /** The entry deleted last, while it can still be brought back. */
  lastDeleted: WorkoutEntry | null;
  addEntry(entry: NewEntry): Promise<void>;
  updateEntry(entry: WorkoutEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  /** Brings back the entry deleted last. */
  undoDelete(): Promise<void>;
  /** Records the weight of a day, replacing the one it had. */
  saveBodyWeight(record: WeightRecord): Promise<void>;
  deleteBodyWeight(date: Day): Promise<void>;
  /** Records the measurements of a day: a number sets a body part, `null` clears it. */
  saveBodyMeasurements(date: Day, values: Readonly<Record<string, number | null>>): Promise<void>;
  saveProfile(changes: Partial<Profile>): Promise<void>;
  /** Changes the given slots of the camp's look. */
  saveLook(changes: Partial<Look>): Promise<void>;
  /** Adds the contents of a backup to what is here, all of it or none. */
  restoreBackup(data: BackupData): Promise<void>;
  /** Adds what was planned from Record's file, all of it or none. */
  importRecord(plan: RecordImport): Promise<void>;
  setGoal(discipline: string, target: number): Promise<void>;
  clearGoal(discipline: string): Promise<void>;
  /** Adds one of the person's own exercises. */
  addExercise(exercise: Omit<Exercise, 'id' | 'builtIn'>): Promise<void>;
  /** Changes the name, direction or units of an own exercise; its kind stays (`changeExercise`). */
  updateExercise(exercise: Exercise): Promise<void>;
  /** Removes an own exercise. Its entries leave the history with it. */
  deleteExercise(id: string): Promise<void>;
  /** Body parts of the person's own, in the order they were added. */
  bodyParts: readonly OwnBodyPart[];
  /** Body parts of the person's own that were deleted, the most recent first. */
  deletedBodyParts: readonly DeletedBodyPart[];
  /** Adds a body part of the person's own. */
  addBodyPart(name: string): Promise<void>;
  renameBodyPart(id: string, name: string): Promise<void>;
  /** Deletes a body part of the person's own. Its measurements go out of sight with it. */
  deleteBodyPart(id: string): Promise<void>;
  /** Brings a deleted body part back, with its measurements. */
  restoreBodyPart(id: string): Promise<void>;
  /** Own exercises that were deleted, the most recent first. */
  deletedExercises: readonly DeletedExercise[];
  /** Brings a deleted exercise back, with its entries. */
  restoreExercise(id: string): Promise<void>;
};

type Stored = Pick<
  Records,
  'history' | 'exercises' | 'deletedExercises' | 'measurements' | 'bodyParts' | 'deletedBodyParts' | 'goals' | 'profile' | 'look'
>;

const RecordsContext = createContext<Records | null>(null);

type Loaded =
  | { status: 'loading' }
  | ({ status: 'ready' } & Stored)
  | { status: 'failed'; error: unknown };

async function read(db: Database): Promise<Stored> {
  const [history, custom, deletedExercises, measurements, bodyParts, deletedBodyParts, goals, profile, look] = await Promise.all([
    loadHistory(db),
    listExercises(db),
    listDeletedExercises(db),
    listBodyMeasurements(db),
    listBodyParts(db),
    listDeletedBodyParts(db),
    listGoals(db),
    loadProfile(db),
    loadLook(db),
  ]);
  return {
    history,
    exercises: [...BUILT_IN_EXERCISES, ...custom],
    deletedExercises,
    measurements,
    bodyParts,
    deletedBodyParts,
    goals,
    profile,
    look,
  };
}

type RecordsProviderProps = {
  children: ReactNode;
  /** Shown instead of the app when the history cannot be read. */
  renderFailure: (error: unknown, retry: () => void) => ReactNode;
};

/**
 * Keeps the history in memory for every screen and is the one place that changes it: each
 * change is written to the database and the history is then read again, so what is on the
 * screen is always what is stored.
 *
 * Nothing below it is drawn until the first read is done.
 */
export function RecordsProvider({ children, renderFailure }: RecordsProviderProps) {
  const db = useDatabase();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [lastDeleted, setLastDeleted] = useState<WorkoutEntry | null>(null);

  const reload = useCallback(async () => {
    setLoaded({ status: 'ready', ...(await read(db)) });
  }, [db]);

  // The first read, and another one each time the person asks to try again after a failure.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;

    read(db).then(
      (found) => {
        if (!cancelled) setLoaded({ status: 'ready', ...found });
      },
      (error: unknown) => {
        if (!cancelled) setLoaded({ status: 'failed', error });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [db, attempt]);

  const ready = loaded.status === 'ready' ? loaded : null;

  const records = useMemo<Records | null>(() => {
    if (!ready) return null;
    const { history, exercises, deletedExercises, measurements, bodyParts, deletedBodyParts, goals, profile, look } = ready;

    return {
      history,
      exercises,
      measurements,
      goals,
      profile,
      look,
      async saveLook(changes) {
        await writeLook(db, changes, Date.now());
        await reload();
      },
      async restoreBackup(data) {
        await db.withExclusiveTransactionAsync((transaction) => writeBackup(transaction, data, Date.now()));
        await reload();
      },
      async importRecord(plan) {
        await db.withExclusiveTransactionAsync((transaction) => writeRecordImport(transaction, plan, Date.now()));
        await reload();
      },
      async setGoal(discipline, target) {
        await writeGoal(db, discipline, target, Date.now());
        await reload();
      },
      async clearGoal(discipline) {
        await removeGoal(db, discipline, Date.now());
        await reload();
      },
      async addExercise(exercise) {
        const now = Date.now();
        await writeExercise(db, { ...exercise, id: `own:${newId(now)}`, builtIn: false }, now);
        await reload();
      },
      async updateExercise(exercise) {
        await writeExercise(db, exercise, Date.now());
        await reload();
      },
      async deleteExercise(id) {
        await markExerciseDeleted(db, id, Date.now());
        await reload();
      },
      bodyParts,
      deletedBodyParts,
      async addBodyPart(name) {
        const now = Date.now();
        await writeBodyPart(db, { id: `own:${newId(now)}`, name }, now);
        await reload();
      },
      async renameBodyPart(id, name) {
        await writeBodyPart(db, { id, name }, Date.now());
        await reload();
      },
      async deleteBodyPart(id) {
        await markBodyPartDeleted(db, id, Date.now());
        await reload();
      },
      async restoreBodyPart(id) {
        await reviveBodyPart(db, id, Date.now());
        await reload();
      },
      deletedExercises,
      async restoreExercise(id) {
        await reviveExercise(db, id, Date.now());
        await reload();
      },
      lastDeleted,
      async saveBodyWeight(record) {
        await writeWeight(db, record, Date.now());
        await reload();
      },
      async deleteBodyWeight(date) {
        await markWeightDeleted(db, date, Date.now());
        await reload();
      },
      async saveBodyMeasurements(date, values) {
        // All the body parts of one form are saved together or not at all.
        await db.withExclusiveTransactionAsync((transaction) => writeMeasurements(transaction, date, values, Date.now()));
        await reload();
      },
      async saveProfile(changes) {
        await writeProfile(db, changes, Date.now());
        await reload();
      },
      async addEntry(entry) {
        const now = Date.now();
        await insertEntry(db, { ...entry, id: newId(now), createdAt: now, videoUrl: '', resultUrl: '' }, now);
        setLastDeleted(null);
        await reload();
      },
      async updateEntry(entry) {
        await replaceEntry(db, entry, Date.now());
        setLastDeleted(null);
        await reload();
      },
      async deleteEntry(id) {
        const entry = history.entries.find((item) => item.id === id) ?? null;
        await markDeleted(db, id, Date.now());
        setLastDeleted(entry);
        await reload();
      },
      async undoDelete() {
        if (!lastDeleted) return;
        await restoreEntry(db, lastDeleted.id, Date.now());
        setLastDeleted(null);
        await reload();
      },
    };
  }, [db, ready, lastDeleted, reload]);

  if (loaded.status === 'failed') {
    return renderFailure(loaded.error, () => {
      setLoaded({ status: 'loading' });
      setAttempt((count) => count + 1);
    });
  }
  if (!records) {
    return null;
  }
  return <RecordsContext.Provider value={records}>{children}</RecordsContext.Provider>;
}

/** The history and the ways to change it. */
export function useRecords(): Records {
  const records = useContext(RecordsContext);
  if (!records) {
    throw new Error('useRecords() needs a <RecordsProvider> above it');
  }
  return records;
}
