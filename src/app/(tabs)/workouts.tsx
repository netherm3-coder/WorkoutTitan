import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen } from '@/components';
import { dayOf, personalBestIds, type Day, type Exercise, type WorkoutEntry } from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { minTouchTarget, spacing, useForeground } from '@/theme';

/** How many entries the journal shows at first, and how many more each time it is asked. */
const PAGE = 50;

type DayGroup = { day: Day; rows: { entry: WorkoutEntry; exercise: Exercise }[] };

export default function WorkoutsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { history, lastDeleted, undoDelete } = useRecords();
  const [limit, setLimit] = useState(PAGE);

  const today = dayOf(new Date());
  const bests = useMemo(() => personalBestIds(history), [history]);

  // Newest first, grouped by day. The history itself is oldest first.
  const groups = useMemo(() => {
    const result: DayGroup[] = [];
    for (const entry of history.entries.slice(-limit).reverse()) {
      const exercise = history.exercises(entry.exerciseId);
      if (!exercise) continue;

      const group = result[result.length - 1];
      if (group && group.day === entry.date) group.rows.push({ entry, exercise });
      else result.push({ day: entry.date, rows: [{ entry, exercise }] });
    }
    return result;
  }, [history, limit]);

  return (
    <Screen subtitle={t('workouts.subtitle')} title={t('workouts.title')}>
      <Button label={t('journal.add')} onPress={() => router.push('/entry/new')} />

      {lastDeleted ? (
        <Card tone="cardAlt">
          <View style={styles.undo}>
            <AppText style={styles.grow}>{t('journal.deleted')}</AppText>
            <Pressable accessibilityRole="button" hitSlop={spacing.md} onPress={() => void undoDelete()}>
              <AppText color="accent" strong>
                {t('journal.undo')}
              </AppText>
            </Pressable>
          </View>
        </Card>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          <EmptyState body={t('workouts.emptyBody')} icon="journal-outline" title={t('workouts.emptyTitle')} />
        </Card>
      ) : null}

      {groups.map((group) => (
        <Card key={group.day}>
          <AppText color="muted" variant="label">
            {format.day(group.day, today)}
          </AppText>
          {group.rows.map(({ entry, exercise }) => (
            <EntryRow
              best={bests.has(entry.id)}
              key={entry.id}
              name={format.discipline(exercise, entry)}
              note={entry.note}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
              result={format.result(entry, exercise)}
            />
          ))}
        </Card>
      ))}

      {history.entries.length > limit ? (
        <Button label={t('journal.showMore')} onPress={() => setLimit((shown) => shown + PAGE)} variant="accent" />
      ) : null}
    </Screen>
  );
}

type EntryRowProps = { name: string; result: string; note: string; best: boolean; onPress: () => void };

function EntryRow({ name, result, note, best, onPress }: EntryRowProps) {
  const { t } = useTranslation();
  const foreground = useForeground();
  const spoken = [name, result, best ? t('journal.personalBest') : null].filter(Boolean).join(', ');

  return (
    <Pressable
      accessibilityLabel={spoken}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
    >
      <View style={styles.grow}>
        <AppText color="muted" variant="label">
          {name}
        </AppText>
        <AppText strong>{result}</AppText>
        {note ? (
          <AppText color="muted" numberOfLines={2} variant="label">
            {note}
          </AppText>
        ) : null}
      </View>
      {best ? <Ionicons color={foreground.accent} name="trophy" size={22} /> : null}
      <Ionicons color={foreground.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  entry: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
