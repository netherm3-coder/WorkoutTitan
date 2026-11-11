import { daysBetween, monthOf } from '../dates';
import { BENCH_PRESS, BODYWEIGHT_CLASSICS, disciplineKey, PULLUPS, RUN, SHUTTLE, SPRINT } from '../exercises';
import { chronological, type History } from '../history';
import { improvementCounts } from '../pedestal';

/** Everything the achievement rules look at, worked out from the history in one pass. */
export type Facts = {
  entries: number;
  /** Most pull-ups in one set. */
  maxPullupReps: number;
  /** How many of pull-ups, push-ups and dips have at least one entry. */
  classicsLogged: number;
  /** Longest run of consecutive days with an entry, ever. */
  longestStreakDays: number;
  /** Most entries in one calendar month. */
  maxEntriesInMonth: number;
  /** Days from the first entry to the last. */
  spanDays: number;
  /** Whether training ever resumed after a gap of 30 days or more. */
  cameBack: boolean;
  sprintEntries: number;
  /** Sprints and shuttle runs together. */
  speedEntries: number;
  runEntries: number;
  /** Distinct disciplines with an entry: a 3 km and a 5 km run are two. */
  disciplines: number;
  /** Most times a single discipline's record was beaten. */
  maxImprovements: number;
  maxEntriesInDiscipline: number;
  /** Heaviest bench press, in kilograms. */
  maxBenchKg: number;
  /** Kilometres covered in exercises measured in kilometres. */
  totalKm: number;
  best1kmRunMs: number | null;
  best3kmRunMs: number | null;
  /** Distinct exercises of the person's own that have an entry. */
  customExercises: number;
  /** Whether any entry was written between midnight and 5 a.m. */
  nightEntry: boolean;
  /** Days on the sobriety counter, or `null` when the person does not use it. */
  soberDays: number | null;
};

const NIGHT_ENDS_AT_HOUR = 5;
const COMEBACK_GAP_DAYS = 30;

export function gatherFacts(history: History, soberDays: number | null): Facts {
  const entries = chronological(history.entries);
  const perMonth = new Map<string, number>();
  const perDiscipline = new Map<string, number>();
  const classics = new Set<string>();
  const custom = new Set<string>();

  const facts: Facts = {
    entries: entries.length,
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
    soberDays,
  };

  let streak = 0;
  let previousDay: string | null = null;

  for (const entry of entries) {
    const exercise = history.exercises(entry.exerciseId);

    // Days: streaks and comebacks.
    if (previousDay === null) {
      streak = 1;
    } else if (entry.date !== previousDay) {
      const gap = daysBetween(previousDay, entry.date);
      streak = gap === 1 ? streak + 1 : 1;
      if (gap >= COMEBACK_GAP_DAYS) facts.cameBack = true;
    }
    previousDay = entry.date;
    facts.longestStreakDays = Math.max(facts.longestStreakDays, streak);

    perMonth.set(monthOf(entry.date), (perMonth.get(monthOf(entry.date)) ?? 0) + 1);

    if (new Date(entry.createdAt).getHours() < NIGHT_ENDS_AT_HOUR) {
      facts.nightEntry = true;
    }

    // Per exercise.
    if (entry.exerciseId === PULLUPS.id) {
      facts.maxPullupReps = Math.max(facts.maxPullupReps, Math.floor(entry.reps ?? 0));
    }
    if (BODYWEIGHT_CLASSICS.some((classic) => classic.id === entry.exerciseId)) {
      classics.add(entry.exerciseId);
    }
    if (entry.exerciseId === SPRINT.id) facts.sprintEntries += 1;
    if (entry.exerciseId === SPRINT.id || entry.exerciseId === SHUTTLE.id) facts.speedEntries += 1;
    if (entry.exerciseId === BENCH_PRESS.id) {
      facts.maxBenchKg = Math.max(facts.maxBenchKg, entry.loadKg ?? 0);
    }
    if (entry.exerciseId === RUN.id) {
      facts.runEntries += 1;
      if (entry.durationMs !== null && entry.durationMs > 0) {
        if (entry.distanceM === 1000) facts.best1kmRunMs = Math.min(facts.best1kmRunMs ?? Infinity, entry.durationMs);
        if (entry.distanceM === 3000) facts.best3kmRunMs = Math.min(facts.best3kmRunMs ?? Infinity, entry.durationMs);
      }
    }

    if (!exercise) continue;

    if (!exercise.builtIn) custom.add(exercise.id);
    if (exercise.kind === 'distanceTime' && exercise.distanceUnit === 'km') {
      facts.totalKm += (entry.distanceM ?? 0) / 1000;
    }

    const discipline = disciplineKey(exercise, entry);
    perDiscipline.set(discipline, (perDiscipline.get(discipline) ?? 0) + 1);
  }

  const first = entries[0];
  const last = entries[entries.length - 1];
  if (first && last) {
    facts.spanDays = daysBetween(first.date, last.date);
  }

  facts.classicsLogged = classics.size;
  facts.customExercises = custom.size;
  facts.disciplines = perDiscipline.size;
  facts.maxEntriesInMonth = Math.max(0, ...perMonth.values());
  facts.maxEntriesInDiscipline = Math.max(0, ...perDiscipline.values());
  facts.maxImprovements = Math.max(0, ...improvementCounts(history).values());

  return facts;
}
