import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { openRecordDatabase } from './open';
import type { Connection } from './types';

const DatabaseContext = createContext<Connection | null>(null);

/** Hands the open database to everything below it. */
export const DatabaseProvider = DatabaseContext.Provider;

/** The open database. Screens read and write through it. */
export function useDatabase(): Connection {
  const db = useContext(DatabaseContext);
  if (!db) {
    throw new Error('useDatabase() needs a <DatabaseProvider> above it');
  }
  return db;
}

export type OpenDatabase =
  | { status: 'opening' }
  | { status: 'ready'; db: Connection }
  /** `retrying` is true while another attempt is under way. */
  | { status: 'failed'; error: unknown; retrying: boolean };

/**
 * Opens the database when the app starts and says how that went. `retry` tries again after a
 * failure.
 */
export function useOpenDatabase(): { state: OpenDatabase; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<OpenDatabase>({ status: 'opening' });

  useEffect(() => {
    let cancelled = false;

    openRecordDatabase().then(
      (db) => {
        if (!cancelled) setState({ status: 'ready', db });
      },
      (error: unknown) => {
        if (!cancelled) setState({ status: 'failed', error, retrying: false });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState((current) => (current.status === 'failed' ? { ...current, retrying: true } : current));
    setAttempt((count) => count + 1);
  }, []);

  return { state, retry };
}
