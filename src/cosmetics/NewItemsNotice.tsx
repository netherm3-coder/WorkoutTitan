import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Icon } from '@/components';
import { minTouchTarget, spacing } from '@/theme';

import { rewardName } from './names';
import { useNewItems } from './NewItemsProvider';

/** How many items the notice names before it only counts the rest. */
const NAMED = 3;

/**
 * Says what the latest achievements opened for the camp, until the person looks into the
 * wardrobe or hides it. Shows nothing when there is nothing new.
 */
export function NewItemsNotice() {
  const { t } = useTranslation();
  const router = useRouter();
  const { fresh, markSeen } = useNewItems();

  if (fresh.length === 0) return null;

  const named = fresh.slice(0, NAMED).map((reward) => rewardName(t, reward)).join(', ');
  const rest = fresh.length - NAMED;
  const list = rest > 0 ? `${named} ${t('camp.news.more', { count: rest })}` : named;

  return (
    <Card tone="cardAlt">
      <View style={styles.row}>
        <Icon color="accent" name="sparkles" size={24} />
        <View accessibilityLiveRegion="polite" style={styles.grow}>
          <AppText strong>{t('camp.news.title', { count: fresh.length })}</AppText>
          <AppText color="muted" variant="label">
            {list}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel={t('camp.news.hide')}
          accessibilityRole="button"
          onPress={markSeen}
          style={({ pressed }) => [styles.hide, pressed && styles.pressed]}
        >
          <Icon name="close" size={22} />
        </Pressable>
      </View>
      <Button label={t('camp.news.tryOn')} onPress={() => router.push('/camp')} variant="quiet" />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: spacing.xs,
  },
  hide: {
    width: minTouchTarget,
    height: minTouchTarget,
    marginTop: -spacing.md,
    marginRight: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
