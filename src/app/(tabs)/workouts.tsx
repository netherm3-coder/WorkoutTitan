import { useTranslation } from 'react-i18next';

import { Card, EmptyState, Screen } from '@/components';

export default function WorkoutsScreen() {
  const { t } = useTranslation();

  return (
    <Screen subtitle={t('workouts.subtitle')} title={t('workouts.title')}>
      <Card>
        <EmptyState body={t('workouts.emptyBody')} icon="journal-outline" title={t('workouts.emptyTitle')} />
      </Card>
    </Screen>
  );
}
