import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Card, Chip } from '@/components';
import { daysBetween, dayOf, isTimed, type ProgressSeries } from '@/domain';
import { formatDuration, formatNumber, useFormat, weightIn } from '@/format';
import { useLanguage } from '@/i18n';
import { spacing } from '@/theme';

import { TIME_STEPS } from './geometry';
import { LineChart } from './LineChart';

export type ProgressCardProps = {
  /** The disciplines to choose from, the one logged last first. */
  series: readonly ProgressSeries[];
};

type Caption = 'reps' | 'load' | 'addedLoad' | 'fastest' | 'longest' | 'most' | 'least';

/** What the line of a discipline stands for, as the caption above the chart says it. */
function captionOf(series: ProgressSeries): Caption {
  const { exercise, metric, higherIsBetter } = series;
  if (metric === 'addedLoad') return 'addedLoad';
  if (isTimed(exercise)) return higherIsBetter ? 'longest' : 'fastest';
  switch (exercise.kind) {
    case 'bodyweight':
      return 'reps';
    case 'weight':
      return 'load';
    default:
      return higherIsBetter ? 'most' : 'least';
  }
}

/**
 * The progress chart of the journal, as in Record: pick a discipline and see how its results
 * went, one point for the best of each day.
 */
export function ProgressCard({ series }: ProgressCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const format = useFormat();
  const [chosen, setChosen] = useState<string | null>(null);

  const current = series.find((item) => item.discipline === chosen) ?? series[0];
  if (!current) return null;

  const today = dayOf(new Date());
  const name = (item: ProgressSeries) => format.discipline(item.exercise, item.latest);
  const kilograms = current.metric === 'addedLoad' || current.exercise.kind === 'weight';
  const timed = current.metric === 'headline' && isTimed(current.exercise);

  // The full value, with its unit, for screen readers. The chart draws weights in the chosen
  // unit, so that its scale falls on round pounds as well as on round kilograms.
  const spoken = (value: number) => (current.metric === 'addedLoad' ? format.weight(value) : format.goal(value, current.exercise));
  const shown = (value: number) => (kilograms ? weightIn(value, format.units.weight) : value);
  const short = (value: number) => (timed ? formatDuration(value) : formatNumber(value, language, kilograms ? 1 : 2));

  const caption = captionOf(current);
  const unit = kilograms ? format.weightUnit : current.exercise.unit;
  const first = current.points[0];
  const last = current.points[current.points.length - 1];

  return (
    <Card>
      <AppText variant="heading">{t('progress.title')}</AppText>
      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={styles.chips}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {series.map((item) => (
          <Chip key={item.discipline} label={name(item)} onPress={() => setChosen(item.discipline)} selected={item === current} />
        ))}
      </ScrollView>
      <AppText color="muted" variant="label">
        {unit ? t(`progress.captionIn.${caption}`, { unit }) : t(`progress.caption.${caption}`)}
      </AppText>

      {first && last && current.points.length >= 2 ? (
        <LineChart
          endLabel={format.day(last.date, today)}
          formatValue={short}
          fromZero={current.higherIsBetter}
          invert={!current.higherIsBetter}
          points={current.points.map((point) => ({ x: daysBetween(first.date, point.date), y: shown(point.value) }))}
          startLabel={format.day(first.date, today)}
          steps={timed ? TIME_STEPS : undefined}
          summary={t('progress.summary', {
            discipline: name(current),
            count: current.points.length,
            first: spoken(first.value),
            from: format.day(first.date, today),
            last: spoken(last.value),
            to: format.day(last.date, today),
          })}
        />
      ) : (
        <View style={styles.wait}>
          <AppText color="muted">{t('progress.needTwoDays')}</AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: spacing.sm,
  },
  wait: {
    paddingVertical: spacing.md,
  },
});
