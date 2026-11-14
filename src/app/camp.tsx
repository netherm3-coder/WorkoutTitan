import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Chip, Icon, LinkRow, Screen } from '@/components';
import {
  ARMOUR_SWATCHES,
  CampScene,
  HAT_TILES,
  itemKey,
  itemName,
  PATTERN_SWATCHES,
  Swatch,
  TENT_SWATCHES,
  Tile,
  useNewItems,
  useWardrobe,
} from '@/cosmetics';
import { isOpen, LOOK_OPTIONS, unlockOf, wardrobeCount, type Look, type LookItem, type Slot } from '@/domain';
import { useFormat } from '@/format';
import { useAchievements } from '@/records';
import { radii, spacing, useTheme } from '@/theme';

export default function CampLookScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { theme } = useTheme();
  const { shown, access, choose } = useWardrobe();
  const { soberDays } = useAchievements();
  const { fresh: freshNow, markSeen } = useNewItems();

  /** What was new when the screen opened. It stays marked while the screen is open. */
  const [news] = useState(() => new Set(freshNow.map(itemKey)));

  // Opening the wardrobe is looking at what is new.
  useEffect(() => {
    markSeen();
  }, [markSeen]);

  /** The locked item the person pressed last: the screen says what opens it. */
  const [asked, setAsked] = useState<{ slot: Slot; item: LookItem } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Opened from a link there is nothing to go back to, so return to the tabs instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const count = wardrobeCount(access);

  const pick = (slot: Slot, item: LookItem) => {
    setProblem(null);
    if (!isOpen(slot, item, access)) {
      setAsked({ slot, item });
      return;
    }
    setAsked(null);
    choose({ [slot]: item } as Partial<Look>).catch(() => setProblem(t('camp.saveFailed')));
  };

  /** What every kind of picker needs to know about one item. */
  const choice = (slot: Slot, item: LookItem) => {
    const locked = !isOpen(slot, item, access);
    const fresh = item !== null && news.has(itemKey({ slot, item }));
    const name = itemName(t, slot, item);
    return {
      accessibilityLabel: locked ? `${name}, ${t('camp.locked')}` : fresh ? `${name}, ${t('camp.fresh')}` : name,
      selected: shown[slot] === item,
      locked,
      fresh,
      onPress: () => pick(slot, item),
    };
  };

  /**
   * A note under the pinned picture. The cards of a skin are slightly see-through, which is
   * fine over the backdrop but not over the choices scrolling underneath, so a note gets a
   * solid backing.
   */
  const note = (content: ReactNode) => (
    <View style={[styles.backing, { backgroundColor: theme.backdrop.gradient[0] }]}>
      <Card tone="cardAlt">{content}</Card>
    </View>
  );

  /** Why the item pressed last is locked. Shown under the picture, where it cannot scroll out of view. */
  const reason = () => {
    if (!asked) return null;
    const unlock = unlockOf(asked.slot, asked.item);
    if (unlock.by === 'start') return null;

    return note(
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.reason}>
        <Icon name="lock-closed" />
        <View style={styles.grow}>
          <AppText strong>{`${t(`camp.slots.${asked.slot}`)}: ${itemName(t, asked.slot, asked.item)}`}</AppText>
          {unlock.by === 'achievement' ? (
            <>
              <AppText>{t('camp.byAchievement', { achievement: t(`achievements.items.${unlock.achievement}.name`) })}</AppText>
              <AppText color="muted" variant="label">
                {format.achievement(unlock.achievement, soberDays)}
              </AppText>
            </>
          ) : (
            <>
              <AppText>{t('camp.byPremium')}</AppText>
              <LinkRow
                hint={t('camp.aboutPremiumHint')}
                icon="heart"
                label={t('camp.aboutPremium')}
                onPress={() => router.push('/support')}
              />
            </>
          )}
        </View>
      </View>,
    );
  };

  const section = (slot: Slot, options: ReactNode) => (
    <View style={styles.section}>
      <AppText variant="label">{`${t(`camp.slots.${slot}`)}: ${itemName(t, slot, shown[slot])}`}</AppText>
      <View
        accessibilityLabel={t(`camp.slots.${slot}`)}
        accessibilityRole="radiogroup"
        style={styles.options}
        testID={`look-${slot}`}
      >
        {options}
      </View>
    </View>
  );

  const chips = (slot: 'pattern' | 'sky' | 'season') =>
    section(
      slot,
      LOOK_OPTIONS[slot].map((item) => {
        const { locked, fresh, ...rest } = choice(slot, item);
        return (
          <Chip
            key={item ?? 'none'}
            {...rest}
            icon={locked ? 'lock-closed' : fresh ? 'sparkles' : undefined}
            label={itemName(t, slot, item)}
          />
        );
      }),
    );

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} pinFirst subtitle={t('camp.subtitle')} title={t('camp.title')}>
      <View style={styles.pinned}>
        <Card flush>
          <CampScene label={t('home.campAlt')} look={shown} />
        </Card>
        {reason()}
        {problem
          ? note(
              <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
                {problem}
              </AppText>,
            )
          : null}
      </View>

      <AppText align="center" color="muted">
        {t('camp.opened', { open: format.number(count.open), total: format.number(count.total) })}
      </AppText>

      <Card>
        <AppText variant="heading">{t('camp.groups.knight')}</AppText>
        {section(
          'armour',
          LOOK_OPTIONS.armour.map((colour) => (
            <Swatch key={colour} color={ARMOUR_SWATCHES[colour]} {...choice('armour', colour)} />
          )),
        )}
        {section(
          'hat',
          LOOK_OPTIONS.hat.map((hat) => (
            <Tile key={hat ?? 'none'} source={hat ? HAT_TILES[hat] : undefined} {...choice('hat', hat)} />
          )),
        )}
      </Card>

      <Card>
        <AppText variant="heading">{t('camp.groups.tent')}</AppText>
        {section(
          'tent',
          LOOK_OPTIONS.tent.map((tent) => <Swatch key={tent} color={TENT_SWATCHES[tent]} {...choice('tent', tent)} />),
        )}
        {chips('pattern')}
        {shown.pattern
          ? section(
              'patternColour',
              LOOK_OPTIONS.patternColour.map((colour) => (
                <Swatch key={colour} color={PATTERN_SWATCHES[colour]} {...choice('patternColour', colour)} />
              )),
            )
          : null}
      </Card>

      <Card>
        <AppText variant="heading">{t('camp.groups.world')}</AppText>
        {chips('sky')}
        {chips('season')}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pinned: {
    gap: spacing.sm,
  },
  backing: {
    borderRadius: radii.lg,
  },
  section: {
    gap: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  grow: {
    flex: 1,
  },
});
