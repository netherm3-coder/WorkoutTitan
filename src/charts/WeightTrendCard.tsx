import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components';
import { daysBetween, dayOf, type WeightRecord } from '@/domain';
import { formatNumber, useFormat, weightIn } from '@/format';
import { useLanguage } from '@/i18n';

import { LineChart } from './LineChart';

export type WeightTrendCardProps = {
  /** The weigh-ins, oldest first. Two at least, or there is no line to draw. */
  weights: readonly WeightRecord[];
};

/** How body weight went, every weigh-in a point, as the weight chart of Record shows it. */
export function WeightTrendCard({ weights }: WeightTrendCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const format = useFormat();

  const first = weights[0];
  const last = weights[weights.length - 1];
  if (!first || !last || weights.length < 2) return null;

  const today = dayOf(new Date());

  return (
    <Card>
      <AppText variant="heading">{t('body.trend')}</AppText>
      <AppText color="muted" variant="label">
        {t('body.trendCaption', { unit: format.weightUnit })}
      </AppText>
      <LineChart
        endLabel={format.day(last.date, today)}
        formatValue={(value) => formatNumber(value, language, 1)}
        points={weights.map((record) => ({ x: daysBetween(first.date, record.date), y: weightIn(record.kg, format.units.weight) }))}
        startLabel={format.day(first.date, today)}
        summary={t('body.trendSummary', {
          count: weights.length,
          first: format.weight(first.kg),
          from: format.day(first.date, today),
          last: format.weight(last.kg),
          to: format.day(last.date, today),
        })}
      />
    </Card>
  );
}
