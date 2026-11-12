import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Day, Elapsed, Exercise, Measures } from '@/domain';
import { useLanguage } from '@/i18n';

import { formatDay, formatElapsed } from './dates';
import { formatNumber } from './numbers';
import { disciplineName, exerciseName, formatGoal, formatResult } from './results';

/** The formatting functions bound to the current language, for use in screens. */
export function useFormat() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return useMemo(
    () => ({
      number: (value: number) => formatNumber(value, language),
      day: (day: Day, today: Day) => formatDay(day, today, t),
      exercise: (exercise: Exercise) => exerciseName(exercise, t),
      discipline: (exercise: Exercise, measures: Pick<Measures, 'distanceM' | 'segments'>) =>
        disciplineName(exercise, measures, t, language),
      result: (measures: Measures, exercise: Exercise) => formatResult(measures, exercise, t, language),
      goal: (goal: number, exercise: Exercise) => formatGoal(goal, exercise, t, language),
      elapsed: (elapsed: Elapsed) => formatElapsed(elapsed, t),
    }),
    [t, language],
  );
}
