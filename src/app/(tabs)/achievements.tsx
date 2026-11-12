import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProgressBar, Screen } from '@/components';
import {
  ACHIEVEMENT_CATEGORIES,
  availablePoints,
  dayOf,
  earnedPoints,
  elapsedSince,
  evaluateAchievements,
  persistentPoints,
  type AchievementState,
} from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const format = useFormat();
  const { history, profile } = useRecords();

  const today = dayOf(new Date());
  // Without a first sober day the counter is off and its achievements are not offered.
  const soberDays = profile.soberSince ? elapsedSince(profile.soberSince, today).totalDays : null;

  const states = useMemo(() => evaluateAchievements(history, { soberDays }), [history, soberDays]);
  const earned = earnedPoints(states);
  const available = availablePoints(states);

  const describe = (state: AchievementState) =>
    t(`achievements.items.${state.id}.description`, { points: format.number(persistentPoints({ soberDays })) });

  return (
    <Screen subtitle={t('achievements.subtitle')} title={t('achievements.title')}>
      <Card tone="cardAlt">
        <AppText variant="heading">
          {t('achievements.points', { earned: format.number(earned), available: format.number(available) })}
        </AppText>
        <ProgressBar label={t('achievements.title')} value={available > 0 ? earned / available : 0} />
      </Card>

      {ACHIEVEMENT_CATEGORIES.map((category) => {
        const items = states.filter((state) => state.category === category);
        if (items.length === 0) return null;

        return (
          <Card key={category}>
            <AppText variant="heading">{t(`achievements.categories.${category}`)}</AppText>
            {items.map((state) => {
              const name = t(`achievements.items.${state.id}.name`);
              const status = t(state.unlocked ? 'achievements.unlocked' : 'achievements.locked');
              const partly = !state.unlocked && state.progress > 0;

              return (
                <View
                  accessibilityLabel={`${name}, ${describe(state)}, ${status}`}
                  accessible
                  key={state.id}
                  style={[styles.item, !state.unlocked && styles.locked]}
                >
                  <AppText style={styles.icon}>{state.icon}</AppText>
                  <View style={styles.text}>
                    <AppText strong>{name}</AppText>
                    <AppText color="muted" variant="label">
                      {describe(state)}
                    </AppText>
                    {partly ? (
                      <ProgressBar
                        label={t('achievements.progress', { percent: Math.floor(state.progress * 100) })}
                        value={state.progress}
                      />
                    ) : null}
                  </View>
                  <AppText color={state.unlocked ? 'accent' : 'muted'} strong>{`+${state.reward}`}</AppText>
                </View>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locked: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 26,
    lineHeight: 34,
    width: 34,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
});
