import { BENCH_PRESS, customExercise, DEFAULT_LOOK, PULLUPS, RUN } from '@/domain';
import { entry, minutes, resetSequence } from '@/domain/__tests__/support';

import {
  BACKUP_VERSION,
  backupFileName,
  buildBackup,
  readBackup,
  serialiseBackup,
  type Backup,
  type BackupData,
} from '../format';

beforeEach(resetSequence);

const PLANK = customExercise({ id: 'own:plank', name: 'Планка', kind: 'duration', better: 'higher' });
const WHEN = new Date('2026-11-13T06:30:00.000Z');

const sample = (): BackupData => ({
  exercises: [PLANK],
  entries: [
    entry(PULLUPS, '2026-03-01', { reps: 12, loadKg: 10 }, { note: 'після сну' }),
    entry(BENCH_PRESS, '2026-03-02', { reps: 5, loadKg: 82.5 }),
    entry(RUN, '2026-03-03', { distanceM: 3000, durationMs: minutes(12, 40) }),
    entry(PLANK, '2026-03-04', { durationMs: minutes(3) }),
  ],
  bodyWeights: [{ date: '2026-03-01', kg: 78.4 }],
  bodyMeasurements: [
    { date: '2026-03-01', part: 'chest', cm: 104 },
    { date: '2026-03-01', part: 'own:calf', cm: 39.5 },
  ],
  bodyParts: [{ id: 'own:calf', name: 'Литка ліва' }],
  goals: [{ discipline: 'pullups', target: 20 }],
  profile: { heightCm: 181, trainingSince: '2021-09-01', soberSince: null },
  look: { ...DEFAULT_LOOK, armour: 'red', hat: 'beanie' },
});

/** The file as text, with something in it changed by hand. */
function tampered(change: (file: Backup & Record<string, unknown>) => void): string {
  const file = JSON.parse(serialiseBackup(buildBackup(sample(), WHEN, '1.0.0'))) as Backup & Record<string, unknown>;
  change(file);
  return JSON.stringify(file);
}

const damagedAt = (text: string) => {
  const reading = readBackup(text);
  return reading.ok ? 'read fine' : reading.problem === 'damaged' ? reading.where : reading.problem;
};

describe('a backup file', () => {
  it('reads back exactly what was written', () => {
    const backup = buildBackup(sample(), WHEN, '1.0.0');

    expect(readBackup(serialiseBackup(backup))).toEqual({ ok: true, backup });
  });

  it('says what it is, which version, when and by which app it was made', () => {
    expect(JSON.parse(serialiseBackup(buildBackup(sample(), WHEN, '1.0.0')))).toMatchObject({
      format: 'record-backup',
      version: BACKUP_VERSION,
      exportedAt: '2026-11-13T06:30:00.000Z',
      appVersion: '1.0.0',
    });
  });

  it('is named by the day it was made', () => {
    expect(backupFileName('2026-11-13')).toBe('record-backup-2026-11-13.json');
  });

  it('holds a whole empty app too', () => {
    const empty: BackupData = {
      exercises: [],
      entries: [],
      bodyWeights: [],
      bodyMeasurements: [],
      bodyParts: [],
      goals: [],
      profile: { heightCm: null, trainingSince: null, soberSince: null },
      look: DEFAULT_LOOK,
    };
    const backup = buildBackup(empty, WHEN, null);

    expect(readBackup(serialiseBackup(backup))).toEqual({ ok: true, backup });
  });
});

describe('a file that is not a backup', () => {
  it.each([
    ['a photo', '\u0089PNG\r\n'],
    ['nothing', ''],
    ['a CSV', 'date,exercise,result\n2026-03-01,Підтягування,12'],
  ])('is told apart when it is %s', (_, text) => {
    expect(readBackup(text)).toEqual({ ok: false, problem: 'notJson' });
  });

  it.each([
    ['other JSON', '{"name":"package"}'],
    ['a list', '[1,2,3]'],
    ['a word', '"record-backup"'],
    ['null', 'null'],
    ['without a version', '{"format":"record-backup"}'],
    ['with a version that is not one', '{"format":"record-backup","version":0}'],
  ])('is told apart when it is %s', (_, text) => {
    expect(readBackup(text)).toEqual({ ok: false, problem: 'notBackup' });
  });

  it('is refused when a newer app made it', () => {
    expect(readBackup(tampered((file) => (file.version = BACKUP_VERSION + 1)))).toEqual({ ok: false, problem: 'newerVersion' });
  });
});

describe('a damaged backup', () => {
  it.each<[string, (file: ReturnType<typeof JSON.parse>) => void, string]>([
    ['no date of making', (file) => delete file.exportedAt, 'exportedAt'],
    ['a date of making that is not one', (file) => (file.exportedAt = 'yesterday'), 'exportedAt'],
    ['entries that are not a list', (file) => (file.entries = {}), 'entries'],
    ['an entry that is not a row', (file) => (file.entries[1] = 'oops'), 'entries[1]'],
    ['an entry without an id', (file) => (file.entries[0].id = ''), 'entries[0].id'],
    ['two entries with one id', (file) => (file.entries[1].id = file.entries[0].id), 'entries'],
    ['an entry of an exercise the file does not have', (file) => (file.entries[3].exerciseId = 'own:gone'), 'entries[3].exerciseId'],
    ['a day that does not exist', (file) => (file.entries[0].date = '2026-02-30'), 'entries[0].date'],
    ['a day in another format', (file) => (file.entries[0].date = '01.03.2026'), 'entries[0].date'],
    ['a number written as text', (file) => (file.entries[0].reps = '12'), 'entries[0].reps'],
    ['pull-ups without repetitions', (file) => (file.entries[0].reps = null), 'entries[0]'],
    ['a run without a time', (file) => delete file.entries[2].durationMs, 'entries[2]'],
    ['a negative extra load', (file) => (file.entries[0].loadKg = -5), 'entries[0]'],
    ['an entry without the moment it was written', (file) => delete file.entries[0].createdAt, 'entries[0].createdAt'],
    ['a note that is not text', (file) => (file.entries[0].note = 7), 'entries[0].note'],
    ['an own exercise without a name', (file) => (file.exercises[0].name = '  '), 'exercises[0].name'],
    ['an own exercise of an unknown kind', (file) => (file.exercises[0].kind = 'swimming'), 'exercises[0].kind'],
    ['an own exercise posing as a built-in one', (file) => (file.exercises[0].id = 'pullups'), 'exercises[0].id'],
    ['the same own exercise twice', (file) => file.exercises.push(file.exercises[0]), 'exercises'],
    ['a weight of zero', (file) => (file.bodyWeights[0].kg = 0), 'bodyWeights[0].kg'],
    ['a weight on no day', (file) => (file.bodyWeights[0].date = null), 'bodyWeights[0].date'],
    ['a measurement of nothing', (file) => (file.bodyMeasurements[0].part = ''), 'bodyMeasurements[0].part'],
    ['a measurement of only spaces', (file) => (file.bodyMeasurements[0].part = '  '), 'bodyMeasurements[0].part'],
    ['a body part posing as a built-in one', (file) => (file.bodyParts[0].id = 'waist'), 'bodyParts[0].id'],
    ['a body part without a name', (file) => (file.bodyParts[0].name = ' '), 'bodyParts[0].name'],
    ['the same body part twice', (file) => file.bodyParts.push(file.bodyParts[0]), 'bodyParts'],
    ['a negative measurement', (file) => (file.bodyMeasurements[1].cm = -1), 'bodyMeasurements[1].cm'],
    ['a goal of zero', (file) => (file.goals[0].target = 0), 'goals[0].target'],
    ['a height that is not a number', (file) => (file.profile.heightCm = 'tall'), 'profile.heightCm'],
    ['a counter that starts on no day', (file) => (file.profile.soberSince = 'never'), 'profile.soberSince'],
  ])('is refused whole for %s', (_, change, where) => {
    expect(damagedAt(tampered(change))).toBe(where);
  });
});

describe('a backup with something left out or extra', () => {
  it('reads a missing section as empty', () => {
    const reading = readBackup(
      tampered((file) => {
        for (const section of ['exercises', 'bodyWeights', 'bodyMeasurements', 'bodyParts', 'goals', 'profile', 'look']) delete file[section];
        file.entries = file.entries.slice(0, 3);
      }),
    );

    expect(reading).toMatchObject({
      ok: true,
      backup: {
        exercises: [],
        bodyWeights: [],
        bodyMeasurements: [],
        bodyParts: [],
        goals: [],
        profile: { heightCm: null, trainingSince: null, soberSince: null },
        look: DEFAULT_LOOK,
      },
    });
  });

  it('fills in what an entry may leave out', () => {
    const reading = readBackup(
      tampered((file) => {
        file.entries = [{ id: 'a', exerciseId: 'pullups', date: '2026-03-01', createdAt: 5, reps: 8 }] as unknown as Backup['entries'];
      }),
    );

    expect(reading.ok && reading.backup.entries).toEqual([
      entry(PULLUPS, '2026-03-01', { reps: 8 }, { id: 'a', createdAt: 5 }),
    ]);
  });

  it('ignores fields it does not know', () => {
    const backup = buildBackup(sample(), WHEN, '1.0.0');
    resetSequence();
    const text = tampered((file) => {
      file.somethingNew = { a: 1 };
      (file.entries[0] as unknown as Record<string, unknown>).mood = 'good';
    });

    expect(readBackup(text)).toEqual({ ok: true, backup });
  });

  it('does not let an own exercise claim to be built in, or carry a field of another kind', () => {
    const reading = readBackup(
      tampered((file) => {
        Object.assign(file.exercises[0] as object, { builtIn: true, unit: 'kg', distanceUnit: 'km' });
      }),
    );

    expect(reading.ok && reading.backup.exercises).toEqual([PLANK]);
  });

  it('keeps the later of two weights on one day, as saving them one by one would', () => {
    const reading = readBackup(tampered((file) => file.bodyWeights.push({ date: '2026-03-01', kg: 79 })));

    expect(reading.ok && reading.backup.bodyWeights).toEqual([{ date: '2026-03-01', kg: 79 }]);
  });

  it('swaps an item of the look this version does not offer for the starting one', () => {
    const reading = readBackup(tampered((file) => Object.assign(file.look, { hat: 'helmet', armour: 'red' })));

    expect(reading.ok && reading.backup.look).toEqual({ ...DEFAULT_LOOK, armour: 'red' });
  });
});
