import { useTranslation } from 'react-i18next';

import { Card, EmptyState, Screen } from '@/components';

export default function AchievementsScreen() {
  const { t } = useTranslation();

  return (
    <Screen subtitle={t('achievements.subtitle')} title={t('achievements.title')}>
      <Card>
        <EmptyState
          body={t('achievements.emptyBody')}
          icon="ribbon-outline"
          title={t('achievements.emptyTitle')}
        />
      </Card>
    </Screen>
  );
}
