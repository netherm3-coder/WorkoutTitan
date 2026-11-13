import type { TFunction } from 'i18next';

import { choosesDirection, isTimed, type Exercise, type Measures } from '@/domain';
import type { Language } from '@/i18n';

import { formatNumber } from './numbers';
import { formatDuration } from './time';

const BUILT_IN_NAMES = {
  pullups: 'exercises.pullups',
  pushups: 'exercises.pushups',
  dips: 'exercises.dips',
  benchPress: 'exercises.benchPress',
  run: 'exercises.run',
  sprint: 'exercises.sprint',
  shuttle: 'exercises.shuttle',
} as const;

const isBuiltInId = (id: string): id is keyof typeof BUILT_IN_NAMES =>
  Object.prototype.hasOwnProperty.call(BUILT_IN_NAMES, id);

/** What an exercise is called: built-in ones in the current language, own ones as they were named. */
export function exerciseName(exercise: Exercise, t: TFunction): string {
  return isBuiltInId(exercise.id) ? t(BUILT_IN_NAMES[exercise.id]) : (exercise.name ?? exercise.id);
}

/**
 * What an exercise records, and which way is better where the person chose it: "Time, more
 * is better". Shuttle runs are named as distances against the clock, which is what they are.
 */
export function exerciseKind(exercise: Exercise, t: TFunction): string {
  const kind = t(`own.kinds.${exercise.kind === 'shuttle' ? 'distanceTime' : exercise.kind}`);
  if (!choosesDirection(exercise.kind) || exercise.better === null) return kind;

  return `${kind}, ${t(exercise.better === 'higher' ? 'own.moreIsBetter' : 'own.lessIsBetter')}`;
}

/**
 * What a discipline is called: the exercise with its distance or shuttle scheme, such as
 * "Run 5 km" or "Shuttle run 4×9 m".
 */
export function disciplineName(
  exercise: Exercise,
  measures: Pick<Measures, 'distanceM' | 'segments'>,
  t: TFunction,
  language: Language,
): string {
  const name = exerciseName(exercise, t);
  const { distanceM, segments } = measures;

  if (exercise.kind === 'distanceTime' && distanceM !== null) {
    return exercise.distanceUnit === 'm'
      ? `${name} ${formatNumber(distanceM, language)} ${t('units.m')}`
      : `${name} ${formatNumber(distanceM / 1000, language)} ${t('units.km')}`;
  }
  if (exercise.kind === 'shuttle' && distanceM !== null && segments !== null) {
    return `${name} ${formatNumber(segments, language)}×${formatNumber(distanceM, language)} ${t('units.m')}`;
  }
  return name;
}

/** Nothing to show: the numbers this kind of exercise needs are missing. */
const BLANK = '—';

/**
 * A result in one line: "12 (+20 kg) (0:41)", "100 kg × 5", "24:30". An entry carried over
 * from Record whose wording says more than its numbers is shown as it was written.
 */
export function formatResult(measures: Measures, exercise: Exercise, t: TFunction, language: Language): string {
  if (measures.text !== null) return measures.text;

  const number = (value: number) => formatNumber(value, language);
  const { reps, loadKg, durationMs, value } = measures;
  const time = durationMs === null ? '' : ` (${formatDuration(durationMs)})`;

  switch (exercise.kind) {
    case 'bodyweight': {
      if (reps === null) return BLANK;
      const load = loadKg ? ` (+${number(loadKg)} ${t('units.kg')})` : '';
      return `${number(reps)}${load}${time}`;
    }
    case 'weight':
      return loadKg === null || reps === null ? BLANK : `${number(loadKg)} ${t('units.kg')} × ${number(reps)}`;
    case 'distanceTime':
    case 'shuttle':
    case 'duration':
      return durationMs === null ? BLANK : formatDuration(durationMs);
    case 'count': {
      if (value === null) return BLANK;
      const unit = exercise.unit ? ` ${exercise.unit}` : '';
      return `${number(value)}${unit}${time}`;
    }
    case 'text':
      return BLANK;
  }
}

/** A goal in the number its discipline is measured by: "20", "100 kg", "20:00". */
export function formatGoal(goal: number, exercise: Exercise, t: TFunction, language: Language): string {
  if (isTimed(exercise)) return formatDuration(goal);

  const number = formatNumber(goal, language);
  if (exercise.kind === 'weight') return `${number} ${t('units.kg')}`;
  return exercise.kind === 'count' && exercise.unit ? `${number} ${exercise.unit}` : number;
}
