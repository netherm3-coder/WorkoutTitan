import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { achievementWeightKg, persistentPoints, type AchievementId, type Day, type Elapsed, type Exercise, type Measures } from '@/domain';
import { useLanguage } from '@/i18n';

import { formatLength, formatWeight, lengthField, weightField } from './amounts';
import { formatDay, formatElapsed } from './dates';
import { formatNumber } from './numbers';
import { disciplineName, exerciseKind, exerciseName, formatGoal, formatResult } from './results';
import { useUnits } from './UnitsProvider';

/** The formatting functions bound to the current language and units, for use in screens. */
export function useFormat() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { units } = useUnits();

  return useMemo(
    () => ({
      units,
      number: (value: number) => formatNumber(value, language),
      day: (day: Day, today: Day) => formatDay(day, today, t),
      exercise: (exercise: Exercise) => exerciseName(exercise, t),
      kind: (exercise: Exercise) => exerciseKind(exercise, t),
      discipline: (exercise: Exercise, measures: Pick<Measures, 'distanceM' | 'segments'>) =>
        disciplineName(exercise, measures, t, language),
      result: (measures: Measures, exercise: Exercise) => formatResult(measures, exercise, t, language, units),
      goal: (goal: number, exercise: Exercise) => formatGoal(goal, exercise, t, language, units),
      elapsed: (elapsed: Elapsed) => formatElapsed(elapsed, t),
      /** "82,5 кг" or "181,9 фунта", from kilograms. */
      weight: (kg: number) => formatWeight(kg, units.weight, t, language),
      /** "81 см" or "31,9 дюйма", from centimetres. */
      length: (cm: number) => formatLength(cm, units.length, t, language),
      /** A weight in kilograms as it goes into a field, in the chosen unit. */
      weightField: (kg: number) => weightField(kg, units.weight, language),
      /** A length in centimetres as it goes into a field, in the chosen unit. */
      lengthField: (cm: number) => lengthField(cm, units.length, language),
      /** The name of the chosen weight unit, for field labels: "кг", "фунти". */
      weightUnit: t(`units.${units.weight}`),
      /** The name of the chosen length unit, for field labels: "см", "дюйми". */
      lengthUnit: t(`units.${units.length}`),
      /** What an achievement asks for, with its weights in the chosen unit. */
      achievement: (id: AchievementId, soberDays: number | null) => {
        const weightKg = achievementWeightKg(id);
        return t(`achievements.items.${id}.description`, {
          points: formatNumber(persistentPoints({ soberDays }), language),
          weight: weightKg === null ? undefined : formatWeight(weightKg, units.weight, t, language),
        });
      },
    }),
    [t, language, units],
  );
}
