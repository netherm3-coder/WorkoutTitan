import { useMemo } from 'react';

import { dayOf, elapsedSince, evaluateAchievements, type AchievementState } from '@/domain';

import { useRecords } from './RecordsProvider';

export type Achievements = {
  states: AchievementState[];
  /** Days on the sobriety counter; `null` when the counter is off and its achievements are not offered. */
  soberDays: number | null;
};

/** The achievements as they stand today. */
export function useAchievements(): Achievements {
  const { history, profile } = useRecords();

  const today = dayOf(new Date());
  const soberDays = profile.soberSince ? elapsedSince(profile.soberSince, today).totalDays : null;

  return useMemo(() => ({ states: evaluateAchievements(history, { soberDays }), soberDays }), [history, soberDays]);
}
