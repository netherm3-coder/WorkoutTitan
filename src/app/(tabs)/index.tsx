import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, CampScene, Card, EmptyState, Screen } from '@/components';
import { buildPedestal, daysStanding, dayOf, lifetimeTotals, type PedestalRecord } from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { history, exercises } = useRecords();

  const today = dayOf(new Date());
  const totals = useMemo(() => lifetimeTotals(history), [history]);

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
    const kg = format.number(record.oneRepMaxKg);
    return t(record.exercise.kind === 'weight' ? 'home.oneRepMax' : 'home.oneRepMaxAdded', { kg });
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
        <CampScene label={t('home.campAlt')} />
      </Card>

      <Button label={t('journal.add')} onPress={() => router.push('/entry/new')} />

      {records.length === 0 ? (
        <Card tone="cardAlt">
          <EmptyState body={t('home.emptyBody')} icon="podium-outline" title={t('home.emptyTitle')} />
        </Card>
      ) : (
        <>
          <Card tone="cardAlt">
            <AppText variant="heading">{t('home.pedestal')}</AppText>
            {records.map((record) => (
              <View
                accessibilityLabel={[
                  format.discipline(record.exercise, record.entry),
                  format.result(record.entry, record.exercise),
                  standing(record),
                ].join(', ')}
                accessible
                key={record.discipline}
                style={styles.record}
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
              </View>
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

const styles = StyleSheet.create({
  record: {
    gap: 2,
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
