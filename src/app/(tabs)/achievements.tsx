import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, ProgressBar, Screen } from '@/components';
import { rewardName } from '@/cosmetics';
import {
  ACHIEVEMENT_CATEGORIES,
  availablePoints,
  earnedPoints,
  rewardsOf,
  type AchievementState,
} from '@/domain';
import { useFormat } from '@/format';
import { useAchievements } from '@/records';
import { spacing } from '@/theme';

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const format = useFormat();
  const { states, soberDays } = useAchievements();
  const earned = earnedPoints(states);
  const available = availablePoints(states);

  const describe = (state: AchievementState) => format.achievement(state.id, soberDays);

  /** What the achievement opens for the camp, or nothing: the sobriety counter opens nothing. */
  const opens = (state: AchievementState) => {
    const rewards = rewardsOf(state.id);
    if (rewards.length === 0) return null;
    return t('achievements.opens', { items: rewards.map((reward) => rewardName(t, reward)).join(', ') });
  };

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
              const reward = opens(state);

              return (
                <View
                  accessibilityLabel={[name, describe(state), reward, status].filter(Boolean).join(', ')}
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
                    {reward ? (
                      <AppText color="accent" variant="label">
                        {reward}
                      </AppText>
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
