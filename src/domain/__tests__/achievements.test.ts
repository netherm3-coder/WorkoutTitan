import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LADDERS,
  ACHIEVEMENTS,
  availablePoints,
  earnedPoints,
  evaluateAchievements,
  gatherFacts,
  persistentPoints,
  type AchievementId,
} from '../achievements';
import { addDays } from '../dates';
import type { WorkoutEntry } from '../entry';
import { BENCH_PRESS, customExercise, DIPS, PULLUPS, PUSHUPS, RUN, SHUTTLE, SPRINT } from '../exercises';

import { entry, history, minutes, resetSequence, seconds } from './support';

beforeEach(resetSequence);

const MARCH = customExercise({ id: 'custom:march', name: 'Марш-кидок', kind: 'distanceTime', distanceUnit: 'km' });
const SWIM = customExercise({ id: 'custom:swim', name: 'Плавання', kind: 'distanceTime', distanceUnit: 'm' });
const PLANK = customExercise({ id: 'custom:plank', name: 'Планка', kind: 'duration', better: 'higher' });

const NO_COUNTER = { soberDays: null };

const unlockedIds = (entries: readonly WorkoutEntry[], soberDays: number | null = null) =>
  evaluateAchievements(history(entries, { custom: [MARCH, SWIM, PLANK] }), { soberDays })
    .filter((state) => state.unlocked)
    .map((state) => state.id);

const stateOf = (id: AchievementId, entries: readonly WorkoutEntry[], soberDays: number | null = null) => {
  const state = evaluateAchievements(history(entries, { custom: [MARCH, SWIM, PLANK] }), { soberDays }).find(
    (item) => item.id === id,
  );
  if (!state) throw new Error(`"${id}" is not on offer`);
  return state;
};

describe('the achievement list', () => {
  it('has 38 achievements with ids of their own', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(ids).toHaveLength(38);
    expect(new Set(ids).size).toBe(38);
  });

  it('files every achievement under a known category', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_CATEGORIES).toContain(achievement.category);
    }
  });

  it('offers 2190 points besides the ones that depend on points, 320 of them for sobriety', () => {
    const plain = ACHIEVEMENTS.filter((achievement) => !('meta' in achievement));
    const total = (list: readonly { reward: number }[]) => list.reduce((sum, item) => sum + item.reward, 0);

    expect(total(plain)).toBe(2190);
    expect(total(plain.filter((achievement) => achievement.category === 'sober'))).toBe(320);
  });

  it('builds ladders from real achievements, each on one ladder only, easiest first', () => {
    const byId = new Map<string, (typeof ACHIEVEMENTS)[number]>(ACHIEVEMENTS.map((item) => [item.id, item]));
    const seen = new Set<string>();

    for (const steps of Object.values(ACHIEVEMENT_LADDERS)) {
      const rewards = steps.map((id) => byId.get(id)?.reward ?? NaN);
      expect(rewards).toEqual([...rewards].sort((a, b) => a - b));
      expect(new Set(rewards).size).toBe(rewards.length);

      for (const id of steps) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });
});

describe('gatherFacts', () => {
  it('starts from nothing', () => {
    expect(gatherFacts(history([]), null)).toEqual({
      entries: 0,
      maxPullupReps: 0,
      classicsLogged: 0,
      longestStreakDays: 0,
      maxEntriesInMonth: 0,
      spanDays: 0,
      cameBack: false,
      sprintEntries: 0,
      speedEntries: 0,
      runEntries: 0,
      disciplines: 0,
      maxImprovements: 0,
      maxEntriesInDiscipline: 0,
      maxBenchKg: 0,
      totalKm: 0,
      best1kmRunMs: null,
      best3kmRunMs: null,
      customExercises: 0,
      nightEntry: false,
      soberDays: null,
    });
  });

  it('reads the whole history in one pass', () => {
    const facts = gatherFacts(
      history(
        [
          entry(PULLUPS, '2026-01-01', { reps: 10 }),
          entry(PULLUPS, '2026-01-02', { reps: 12.5, loadKg: 10 }),
          entry(PUSHUPS, '2026-01-02', { reps: 40 }),
          entry(BENCH_PRESS, '2026-01-03', { reps: 3, loadKg: 110 }),
          entry(BENCH_PRESS, '2026-01-03', { reps: 8, loadKg: 90 }),
          entry(SPRINT, '2026-01-10', { distanceM: 100, durationMs: seconds(13) }),
          entry(SHUTTLE, '2026-01-10', { segments: 4, distanceM: 9, durationMs: seconds(9.9) }),
          entry(RUN, '2026-01-11', { distanceM: 1000, durationMs: minutes(3, 50) }),
          entry(RUN, '2026-01-12', { distanceM: 1000, durationMs: minutes(3, 41) }),
          entry(RUN, '2026-02-20', { distanceM: 3000, durationMs: minutes(12, 30) }),
          entry(MARCH, '2026-02-21', { distanceM: 30_000, durationMs: minutes(260) }),
          entry(SWIM, '2026-02-21', { distanceM: 400, durationMs: minutes(8) }),
          entry(PLANK, '2026-02-22', { durationMs: minutes(3) }),
        ],
        { custom: [MARCH, SWIM, PLANK] },
      ),
      12,
    );

    expect(facts).toEqual({
      entries: 13,
      maxPullupReps: 12,
      classicsLogged: 2,
      longestStreakDays: 3,
      maxEntriesInMonth: 9,
      spanDays: 52,
      cameBack: true,
      sprintEntries: 1,
      speedEntries: 2,
      runEntries: 3,
      // pullups, pushups, benchPress, sprint@100, shuttle@4x9, run@1000, run@3000, march@30000, swim@400, plank
      disciplines: 10,
      maxImprovements: 1,
      maxEntriesInDiscipline: 2,
      maxBenchKg: 110,
      // 1 + 1 + 3 km of runs and a 30 km march; the swim is measured in metres and stays out.
      totalKm: 35,
      best1kmRunMs: minutes(3, 41),
      best3kmRunMs: minutes(12, 30),
      customExercises: 3,
      nightEntry: false,
      soberDays: 12,
    });
  });

  it('remembers the longest streak, not the latest one', () => {
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-10', '2026-01-11'];
    const facts = gatherFacts(history(days.map((day) => entry(PULLUPS, day, { reps: 5 }))), null);
    expect(facts.longestStreakDays).toBe(4);
  });

  it('counts several entries on one day as one day of a streak', () => {
    const facts = gatherFacts(
      history([
        entry(PULLUPS, '2026-01-01', { reps: 5 }),
        entry(PUSHUPS, '2026-01-01', { reps: 20 }),
        entry(PULLUPS, '2026-01-02', { reps: 5 }),
      ]),
      null,
    );
    expect(facts.longestStreakDays).toBe(2);
  });

  it('calls a return after exactly 30 days a comeback, and after 29 not yet', () => {
    const gap = (days: number) =>
      gatherFacts(
        history([entry(PULLUPS, '2026-01-01', { reps: 5 }), entry(PULLUPS, addDays('2026-01-01', days), { reps: 5 })]),
        null,
      ).cameBack;

    expect(gap(30)).toBe(true);
    expect(gap(29)).toBe(false);
  });

  it('notices an entry written between midnight and five in the morning', () => {
    const at = (hour: number, minute = 0) =>
      gatherFacts(
        history([entry(PULLUPS, '2026-01-01', { reps: 5 }, { createdAt: new Date(2026, 0, 1, hour, minute).getTime() })]),
        null,
      ).nightEntry;

    expect(at(0)).toBe(true);
    expect(at(4, 59)).toBe(true);
    expect(at(5)).toBe(false);
    expect(at(23, 59)).toBe(false);
  });

  it('counts a faster run as beating the record', () => {
    const facts = gatherFacts(
      history([
        entry(RUN, '2026-01-01', { distanceM: 5000, durationMs: minutes(27) }),
        entry(RUN, '2026-01-08', { distanceM: 5000, durationMs: minutes(26) }),
        entry(RUN, '2026-01-15', { distanceM: 5000, durationMs: minutes(26, 30) }),
        entry(RUN, '2026-01-22', { distanceM: 5000, durationMs: minutes(25) }),
      ]),
      null,
    );
    expect(facts.maxImprovements).toBe(2);
  });
});

describe('evaluateAchievements', () => {
  it('unlocks nothing for an empty history', () => {
    const states = evaluateAchievements(history([]), NO_COUNTER);

    expect(states.filter((state) => state.unlocked)).toEqual([]);
    expect(states.every((state) => state.progress === 0)).toBe(true);
    expect(earnedPoints(states)).toBe(0);
  });

  it('keeps the order of the list', () => {
    const states = evaluateAchievements(history([]), { soberDays: 0 });
    expect(states.map((state) => state.id)).toEqual(ACHIEVEMENTS.map((achievement) => achievement.id));
  });

  it('offers the sobriety achievements only to people who use the counter', () => {
    const without = evaluateAchievements(history([]), NO_COUNTER);
    const withCounter = evaluateAchievements(history([]), { soberDays: 0 });

    expect(without.some((state) => state.category === 'sober')).toBe(false);
    expect(without).toHaveLength(34);
    expect(withCounter.filter((state) => state.category === 'sober')).toHaveLength(4);
    expect(availablePoints(without)).toBe(2170);
    expect(availablePoints(withCounter)).toBe(2490);
  });

  it('rewards the very first entry', () => {
    expect(unlockedIds([entry(PULLUPS, '2026-01-01', { reps: 3 })])).toEqual(['first_pullup', 'first_step']);
  });

  it('shows how far along a locked achievement is', () => {
    expect(stateOf('ten_pullups', [entry(PULLUPS, '2026-01-01', { reps: 7 })])).toMatchObject({
      unlocked: false,
      progress: 0.7,
      reward: 15,
      category: 'strength',
    });
  });

  it('climbs the pull-up ladder with the longest set', () => {
    const ids = unlockedIds([entry(PULLUPS, '2026-01-01', { reps: 22 })]);
    expect(ids).toEqual(expect.arrayContaining(['first_pullup', 'ten_pullups', 'twenty_pullups']));
    expect(ids).not.toContain('fifty_pullups');
  });

  it('places achievements on their ladders', () => {
    const states = evaluateAchievements(history([]), { soberDays: 0 });
    const ladderOf = (id: AchievementId) => states.find((state) => state.id === id)?.ladder;

    expect(ladderOf('first_pullup')).toEqual({ name: 'pullups', level: 1, levels: 5 });
    expect(ladderOf('century_pullups')).toEqual({ name: 'pullups', level: 5, levels: 5 });
    expect(ladderOf('sober_100')).toEqual({ name: 'sober', level: 3, levels: 4 });
    expect(ladderOf('comeback')).toBeNull();
  });

  it('judges the bench press by the weight on the bar', () => {
    const ids = unlockedIds([entry(BENCH_PRESS, '2026-01-01', { reps: 1, loadKg: 150 })]);
    expect(ids).toEqual(expect.arrayContaining(['bench_100', 'bench_150']));
    expect(ids).not.toContain('bench_200');
    expect(stateOf('bench_200', [entry(BENCH_PRESS, '2026-01-01', { reps: 1, loadKg: 150 })]).progress).toBe(0.75);
  });

  it('times the kilometre', () => {
    const run = (durationMs: number) => [entry(RUN, '2026-01-01', { distanceM: 1000, durationMs })];

    expect(unlockedIds(run(minutes(4)))).toContain('run1k_400');
    expect(unlockedIds(run(minutes(4, 1)))).not.toContain('run1k_400');
    expect(unlockedIds(run(minutes(3, 29)))).toEqual(expect.arrayContaining(['run1k_400', 'run1k_330']));
    expect(stateOf('run1k_330', run(minutes(4, 12))).progress).toBeCloseTo(210 / 252, 10);
  });

  it('does not take a kilometre split out of a longer run', () => {
    const ids = unlockedIds([entry(RUN, '2026-01-01', { distanceM: 3000, durationMs: minutes(10, 30) })]);
    expect(ids).toContain('run3k_1100');
    expect(ids).not.toContain('run1k_400');
  });

  it('follows the sobriety counter', () => {
    expect(unlockedIds([], 6)).toEqual([]);
    expect(unlockedIds([], 7)).toEqual(['sober_7']);
    expect(unlockedIds([], 400)).toEqual(['sober_7', 'sober_30', 'sober_100', 'sober_365']);
    expect(stateOf('sober_30', [], 15).progress).toBe(0.5);
  });

  it('locks an achievement again when the entry that earned it is gone', () => {
    const entries = [entry(PULLUPS, '2026-01-01', { reps: 12 }), entry(PULLUPS, '2026-01-02', { reps: 8 })];

    expect(unlockedIds(entries)).toContain('ten_pullups');
    expect(unlockedIds(entries.slice(1))).not.toContain('ten_pullups');
  });
});

describe('the "persistent" achievement', () => {
  /** Nearly everything a history can earn: all but 1000 km, five own exercises and a night entry. */
  function fullHistory(): WorkoutEntry[] {
    const entries: WorkoutEntry[] = [];

    // Thirty days in a row, a longer set every day, up to a hundred.
    for (let day = 0; day < 30; day += 1) {
      entries.push(entry(PULLUPS, addDays('2026-01-01', day), { reps: 71 + day }));
    }
    entries.push(entry(PUSHUPS, '2026-01-05', { reps: 60 }), entry(DIPS, '2026-01-05', { reps: 30 }));
    entries.push(entry(BENCH_PRESS, '2026-01-06', { reps: 1, loadKg: 200 }));
    for (let index = 0; index < 5; index += 1) {
      entries.push(entry(SPRINT, '2026-01-07', { distanceM: 100, durationMs: seconds(12 + index) }));
    }
    for (let index = 0; index < 9; index += 1) {
      entries.push(entry(RUN, '2026-01-08', { distanceM: 5000, durationMs: minutes(20 + index) }));
    }
    entries.push(entry(RUN, '2026-01-09', { distanceM: 1000, durationMs: minutes(2, 30) }));
    entries.push(entry(RUN, '2026-01-09', { distanceM: 3000, durationMs: minutes(10) }));
    // Half a year later, after a long break.
    entries.push(entry(PUSHUPS, '2026-08-01', { reps: 50 }), entry(DIPS, '2026-08-01', { reps: 25 }));

    return entries;
  }

  it('asks for the share of points Record asked for, of whatever is on offer', () => {
    expect(persistentPoints({ soberDays: 0 })).toBe(1500);
    expect(persistentPoints(NO_COUNTER)).toBe(1300);
  });

  it('is earned with points from the other achievements, and adds its own', () => {
    const states = evaluateAchievements(history(fullHistory()), NO_COUNTER);

    expect(states.filter((state) => !state.unlocked).map((state) => state.id)).toEqual(['odyssey', 'polyglot', 'night_shift']);
    // 1870 on offer without the counter, less 250 + 35 + 25 still locked, plus 300 for "persistent".
    expect(earnedPoints(states)).toBe(1560 + 300);
  });

  it('stays locked just short of the bar and shows how close it is', () => {
    const withoutBench = fullHistory().filter((item) => item.exerciseId !== BENCH_PRESS.id);
    const state = evaluateAchievements(history(withoutBench), NO_COUNTER).find((item) => item.id === 'persistent');

    // The three bench achievements are worth 270: 1560 - 270 = 1290 of the 1300 needed.
    expect(withoutBench).toHaveLength(50);
    expect(state).toMatchObject({ unlocked: false, progress: 1290 / 1300 });
  });

  it('does not count its own points toward itself', () => {
    const states = evaluateAchievements(history(fullHistory()), { soberDays: 0 });
    const persistent = states.find((state) => state.id === 'persistent');

    // 1560 of 1500 with the counter on offer: unlocked, and the progress is capped at 1.
    expect(persistent).toMatchObject({ unlocked: true, progress: 1 });
  });
});
