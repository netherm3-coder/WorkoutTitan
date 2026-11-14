import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, ProgressBar, Screen } from '@/components';
import { CampScene, NewItemsNotice, useWardrobe } from '@/cosmetics';
import {
  buildPedestal,
  daysStanding,
  dayOf,
  elapsedSince,
  goalProgress,
  lifetimeTotals,
  NO_MEASURES,
  PULLUPS,
  sportStatus,
  type PedestalRecord,
} from '@/domain';
import { useFormat } from '@/format';
import { toRouteParam } from '@/navigation';
import { useRecords } from '@/records';
import { minTouchTarget, radii, spacing } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { history, exercises, goals, profile } = useRecords();
  const { shown } = useWardrobe();

  const today = dayOf(new Date());
  const totals = useMemo(() => lifetimeTotals(history), [history]);
  const status = useMemo(() => sportStatus(history, today), [history, today]);

  // In the order of the exercise list, and within an exercise by distance or scheme.
  const records = useMemo(() => {
    const order = new Map(exercises.map((exercise, index) => [exercise.id, index]));
    return [...buildPedestal(history).values()].sort(
      (a, b) =>
        (order.get(a.exercise.id) ?? 0) - (order.get(b.exercise.id) ?? 0) ||
        (a.entry.distanceM ?? 0) - (b.entry.distanceM ?? 0) ||
        (a.entry.segments ?? 0) - (b.entry.segments ?? 0),
    );
  }, [history, exercises]);

  const standing = (record: PedestalRecord) => {
    const days = daysStanding(record, today);
    return days === 0 ? t('home.setToday') : t('home.standing', { count: days });
  };

  const oneRepMax = (record: PedestalRecord) => {
    if (record.oneRepMaxKg === null) return null;
    const weight = format.weight(record.oneRepMaxKg);
    return t(record.exercise.kind === 'weight' ? 'home.oneRepMax' : 'home.oneRepMaxAdded', { weight });
  };

  /** The goal of a record and how far along it is, for screen readers; nothing without a goal. */
  const goalWords = (record: PedestalRecord): string[] => {
    const goal = goals.get(record.discipline);
    return goal === undefined
      ? []
      : [t('home.goal', { goal: format.goal(goal, record.exercise) }), `${goalProgress(record, goal)}%`];
  };

  const totalRows: [label: string, value: string][] = [
    [t('exercises.pullups'), format.number(totals.pullups)],
    [t('exercises.pushups'), format.number(totals.pushups)],
    [t('exercises.dips'), format.number(totals.dips)],
    [t('exercises.run'), `${format.number(totals.runKm)} ${t('units.km')}`],
    [t('home.otherEntries'), format.number(totals.otherEntries)],
  ];

  return (
    <Screen subtitle={t('home.subtitle')} title={t('home.title')}>
      <Card flush>
        <CampScene label={t('home.campAlt')} look={shown} />
        <Pressable
          accessibilityLabel={t('camp.open')}
          accessibilityRole="button"
          onPress={() => router.push('/camp')}
          style={({ pressed }) => [styles.dress, pressed && styles.pressed]}
        >
          <Ionicons color="#ffffff" name="color-palette-outline" size={24} />
        </Pressable>
      </Card>

      <NewItemsNotice />

      <Button label={t('journal.add')} onPress={() => router.push('/entry/new')} />

      {profile.trainingSince || profile.soberSince ? (
        <Card>
          {(
            [
              [t('counters.training'), profile.trainingSince],
              [t('counters.sober'), profile.soberSince],
            ] as const
          ).map(([label, since]) =>
            since ? (
              <View accessibilityLabel={`${label}: ${format.elapsed(elapsedSince(since, today))}`} accessible key={label}>
                <AppText color="muted" variant="label">
                  {label}
                </AppText>
                <AppText strong>{format.elapsed(elapsedSince(since, today))}</AppText>
              </View>
            ) : null,
          )}
        </Card>
      ) : null}

      {records.length === 0 ? (
        <Card tone="cardAlt">
          <EmptyState body={t('home.emptyBody')} icon="podium-outline" title={t('home.emptyTitle')} />
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="heading">{t('status.title')}</AppText>
            {status.state === 'ranked' ? (
              <>
                <View
                  accessibilityLabel={`${t('status.title')}: ${t(`status.levels.${status.level}`)}`}
                  accessible
                  style={styles.recordHead}
                >
                  <AppText style={styles.grow} variant="title">
                    {t(`status.levels.${status.level}`)}
                  </AppText>
                  <AppText color="muted" variant="label">
                    {t('status.coefficient', { value: format.number(status.coefficient) })}
                  </AppText>
                </View>
                <ProgressBar label={t('status.title')} value={status.progressPercent / 100} />
                <AppText variant="label">
                  {status.nextLevel && status.kgToNextLevel !== null
                    ? t('status.toNext', {
                        weight: format.weight(status.kgToNextLevel),
                        level: t(`status.levels.${status.nextLevel}`),
                      })
                    : t('status.top')}
                </AppText>
                <View>
                  <AppText color="muted" variant="label">
                    {t('status.best', {
                      result: format.result({ ...NO_MEASURES, reps: status.best.reps, loadKg: status.best.loadKg }, PULLUPS),
                    })}
                  </AppText>
                  <AppText color="muted" variant="label">
                    {format.day(status.best.date, today)}
                  </AppText>
                  {status.best.repsCapped ? (
                    <AppText color="muted" variant="label">
                      {t('status.capped')}
                    </AppText>
                  ) : null}
                </View>
              </>
            ) : (
              <AppText color="muted">
                {t(status.state === 'needsBodyWeight' ? 'status.needsBodyWeight' : 'status.needsPullups')}
              </AppText>
            )}
          </Card>

          <Card tone="cardAlt">
            <AppText variant="heading">{t('home.pedestal')}</AppText>
            {records.map((record) => (
              <Pressable
                accessibilityHint={t('home.openGoal')}
                accessibilityLabel={[
                  format.discipline(record.exercise, record.entry),
                  format.result(record.entry, record.exercise),
                  standing(record),
                  ...goalWords(record),
                ].join(', ')}
                accessibilityRole="button"
                key={record.discipline}
                onPress={() => router.push({ pathname: '/goal', params: { discipline: toRouteParam(record.discipline) } })}
                style={({ pressed }) => [styles.record, pressed && styles.pressed]}
              >
                <View style={styles.recordHead}>
                  <AppText color="muted" style={styles.grow} variant="label">
                    {format.discipline(record.exercise, record.entry)}
                  </AppText>
                  <AppText color="muted" variant="label">
                    {standing(record)}
                  </AppText>
                </View>
                <AppText variant="title">{format.result(record.entry, record.exercise)}</AppText>
                {oneRepMax(record) ? (
                  <AppText color="accent" variant="label">
                    {oneRepMax(record)}
                  </AppText>
                ) : null}
                {goals.has(record.discipline) ? <GoalLine goal={goals.get(record.discipline) ?? 0} record={record} /> : null}
              </Pressable>
            ))}
          </Card>

          <Card>
            <AppText variant="heading">{t('home.totals')}</AppText>
            {totalRows.map(([label, value]) => (
              <View accessibilityLabel={`${label}: ${value}`} accessible key={label} style={styles.total}>
                <AppText style={styles.grow}>{label}</AppText>
                <AppText strong>{value}</AppText>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

/** How far the best result is from the goal of its discipline. */
function GoalLine({ record, goal }: { record: PedestalRecord; goal: number }) {
  const { t } = useTranslation();
  const format = useFormat();
  const label = t('home.goal', { goal: format.goal(goal, record.exercise) });

  return (
    <View style={styles.goal}>
      <AppText color="muted" variant="label">
        {label}
      </AppText>
      <ProgressBar label={label} value={goalProgress(record, goal) / 100} />
    </View>
  );
}

const styles = StyleSheet.create({
  dress: {
    // On the picture itself, so it has its own dark backing whatever the sky behind it.
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  record: {
    gap: 2,
  },
  goal: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  recordHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  total: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
});
