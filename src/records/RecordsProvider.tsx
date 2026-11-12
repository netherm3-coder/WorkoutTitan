import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  addEntry as insertEntry,
  deleteEntry as markDeleted,
  listExercises,
  loadHistory,
  newId,
  restoreEntry,
  updateEntry as replaceEntry,
  useDatabase,
  type Database,
} from '@/db';
import { BUILT_IN_EXERCISES, type Day, type Exercise, type History, type Measures, type WorkoutEntry } from '@/domain';

/** What the form hands over for a new entry; the id and the moment of writing are added here. */
export type NewEntry = Measures & { exerciseId: string; date: Day; note: string };

export type Records = {
  /** Everything recorded so far. A new object after every change. */
  history: History;
  /** Every exercise a result can be logged for: the built-in ones, then the person's own. */
  exercises: readonly Exercise[];
  /** The entry deleted last, while it can still be brought back. */
  lastDeleted: WorkoutEntry | null;
  addEntry(entry: NewEntry): Promise<void>;
  updateEntry(entry: WorkoutEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  /** Brings back the entry deleted last. */
  undoDelete(): Promise<void>;
};

const RecordsContext = createContext<Records | null>(null);

type Loaded =
  | { status: 'loading' }
  | { status: 'ready'; history: History; exercises: readonly Exercise[] }
  | { status: 'failed'; error: unknown };

async function read(db: Database): Promise<{ history: History; exercises: readonly Exercise[] }> {
  const [history, custom] = await Promise.all([loadHistory(db), listExercises(db)]);
  return { history, exercises: [...BUILT_IN_EXERCISES, ...custom] };
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
    const { history, exercises } = ready;

    return {
      history,
      exercises,
      lastDeleted,
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
