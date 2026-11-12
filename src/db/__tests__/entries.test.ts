import { chronological, PULLUPS, RUN, type WorkoutEntry } from '@/domain';
import { entry, resetSequence } from '@/domain/__tests__/support';

import { addEntries, addEntry, deleteEntry, getEntry, LIST_ENTRIES, listEntries, restoreEntry, updateEntry } from '../entries';

import { openTestDatabase, type TestDatabase } from './testDatabase';

let db: TestDatabase;

beforeEach(async () => {
  resetSequence();
  db = await openTestDatabase();
});

const stored = (id: string) =>
  db.getFirstAsync<{ created_at: number; updated_at: number; deleted_at: number | null }>(
    'SELECT created_at, updated_at, deleted_at FROM entries WHERE id = ?',
    [id],
  );

describe('adding and reading entries', () => {
  it('starts with none', async () => {
    expect(await listEntries(db)).toEqual([]);
  });

  it('gives back every field exactly as it was saved', async () => {
    const everything: WorkoutEntry = {
      id: 'abc',
      exerciseId: 'custom:вихід-силою',
      date: '2026-11-12',
      createdAt: 1_770_000_000_123,
      reps: 12.5,
      loadKg: 7.5,
      durationMs: 41_200,
      distanceM: 0.01,
      segments: 4,
      value: 100,
      text: '12 (вузький хват) 💪',
      note: 'після нічної,\nдруга спроба',
      videoUrl: 'https://example.com/v?x=1&y=2',
      resultUrl: 'https://example.com/r',
    };
    const nothing = entry(PULLUPS, '2026-11-13');

    await addEntries(db, [everything, nothing], 5);

    expect(await listEntries(db)).toEqual([everything, nothing]);
    expect(await getEntry(db, 'abc')).toEqual(everything);
  });

  it('reads them oldest first, in the order the calculations expect', async () => {
    const entries = [
      entry(PULLUPS, '2026-03-02', { reps: 9 }, { id: 'b', createdAt: 2000 }),
      entry(PULLUPS, '2026-03-02', { reps: 10 }, { id: 'c', createdAt: 2000 }),
      entry(RUN, '2026-03-01', { distanceM: 5000, durationMs: 1_500_000 }, { id: 'z', createdAt: 9000 }),
      entry(PULLUPS, '2026-03-02', { reps: 8 }, { id: 'a', createdAt: 1000 }),
      entry(PULLUPS, '2025-12-31', { reps: 7 }, { id: 'y', createdAt: 1 }),
    ];
    await addEntries(db, entries, 5);

    const listed = await listEntries(db);
    expect(listed.map((item) => item.id)).toEqual(['y', 'z', 'a', 'b', 'c']);
    expect(listed).toEqual(chronological(entries));
  });

  it('reads them in order straight from the index, without sorting', async () => {
    const plan = await db.getAllAsync<{ detail: string }>(`EXPLAIN QUERY PLAN ${LIST_ENTRIES}`, []);
    const steps = plan.map((step) => step.detail).join('; ');

    expect(steps).toContain('entries_in_order');
    expect(steps).not.toContain('TEMP B-TREE');
  });

  it('adds hundreds at once in a few statements', async () => {
    const many = Array.from({ length: 250 }, (_item, index) => entry(PULLUPS, '2026-01-01', { reps: index + 1 }));
    await addEntries(db, many, 5);

    expect(db.statements.filter((statement) => statement.startsWith('INSERT'))).toHaveLength(3);
    expect(await listEntries(db)).toEqual(many);
  });

  it('refuses an id that is already taken', async () => {
    await addEntry(db, entry(PULLUPS, '2026-01-01', { reps: 5 }, { id: 'same' }), 5);
    await expect(addEntry(db, entry(PULLUPS, '2026-01-02', { reps: 6 }, { id: 'same' }), 6)).rejects.toThrow(/UNIQUE/);
  });

  it('refuses a day that is not a day', async () => {
    await expect(addEntry(db, { ...entry(PULLUPS, '2026-01-01'), date: 'yesterday' }, 5)).rejects.toThrow(/CHECK/);
  });

  it('stores a number that is not a number as no number', async () => {
    await addEntry(db, entry(PULLUPS, '2026-01-01', { reps: NaN, loadKg: Infinity, value: -Infinity }, { id: 'odd' }), 5);

    expect(await getEntry(db, 'odd')).toMatchObject({ reps: null, loadKg: null, value: null });
  });

  it('finds nothing for an id that was never saved', async () => {
    expect(await getEntry(db, 'missing')).toBeNull();
  });
});

describe('editing an entry', () => {
  it('replaces the result and keeps the moment it was first written', async () => {
    const original = entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'e', createdAt: 1000, note: 'перша' });
    await addEntry(db, original, 1000);

    const edited: WorkoutEntry = {
      ...original,
      exerciseId: RUN.id,
      date: '2026-01-02',
      reps: null,
      distanceM: 5000,
      durationMs: 1_500_000,
      note: 'виправив',
      createdAt: 999_999,
    };
    expect(await updateEntry(db, edited, 2000)).toBe(true);

    expect(await getEntry(db, 'e')).toEqual({ ...edited, createdAt: 1000 });
    expect(await stored('e')).toEqual({ created_at: 1000, updated_at: 2000, deleted_at: null });
  });

  it('says so when there is nothing to edit', async () => {
    expect(await updateEntry(db, entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'ghost' }), 5)).toBe(false);
    expect(await listEntries(db)).toEqual([]);
  });
});

describe('deleting an entry', () => {
  beforeEach(async () => {
    await addEntries(
      db,
      [entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'keep' }), entry(PULLUPS, '2026-01-02', { reps: 11 }, { id: 'drop' })],
      1000,
    );
  });

  it('takes it out of the history but keeps the row, marked with the time', async () => {
    expect(await deleteEntry(db, 'drop', 2000)).toBe(true);

    expect((await listEntries(db)).map((item) => item.id)).toEqual(['keep']);
    expect(await getEntry(db, 'drop')).toBeNull();
    expect(await stored('drop')).toMatchObject({ updated_at: 2000, deleted_at: 2000 });
  });

  it('can be undone', async () => {
    await deleteEntry(db, 'drop', 2000);
    expect(await restoreEntry(db, 'drop', 3000)).toBe(true);

    expect((await listEntries(db)).map((item) => item.id)).toEqual(['keep', 'drop']);
    expect(await stored('drop')).toMatchObject({ updated_at: 3000, deleted_at: null });
  });

  it('happens once: deleting again, or restoring what is not deleted, changes nothing', async () => {
    await deleteEntry(db, 'drop', 2000);

    expect(await deleteEntry(db, 'drop', 2500)).toBe(false);
    expect(await deleteEntry(db, 'missing', 2500)).toBe(false);
    expect(await restoreEntry(db, 'keep', 2500)).toBe(false);
    expect(await stored('drop')).toMatchObject({ updated_at: 2000, deleted_at: 2000 });
  });

  it('puts a deleted entry out of reach of edits', async () => {
    await deleteEntry(db, 'drop', 2000);
    expect(await updateEntry(db, entry(PULLUPS, '2026-01-02', { reps: 99 }, { id: 'drop' }), 2500)).toBe(false);
  });
});

describe('several changes as one', () => {
  it('keeps all of them when the last one succeeds', async () => {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await addEntry(transaction, entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'one' }), 5);
      await addEntry(transaction, entry(PULLUPS, '2026-01-02', { reps: 11 }, { id: 'two' }), 5);
    });

    expect((await listEntries(db)).map((item) => item.id)).toEqual(['one', 'two']);
  });

  it('have to be made through the transaction, not around it', async () => {
    const around = db.withExclusiveTransactionAsync(async () => {
      await addEntry(db, entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'stray' }), 5);
    });

    await expect(around).rejects.toThrow('write through the transaction');
    expect(await listEntries(db)).toEqual([]);
  });

  it('keeps none of them when one fails', async () => {
    await addEntry(db, entry(PULLUPS, '2026-01-01', { reps: 10 }, { id: 'before' }), 5);

    const batch = Array.from({ length: 150 }, (_item, index) => entry(PULLUPS, '2026-01-02', { reps: index }, { id: `new-${index}` }));
    batch.push(entry(PULLUPS, '2026-01-03', { reps: 1 }, { id: 'before' }));

    await expect(db.withExclusiveTransactionAsync((transaction) => addEntries(transaction, batch, 6))).rejects.toThrow(/UNIQUE/);

    expect((await listEntries(db)).map((item) => item.id)).toEqual(['before']);
  });
});
