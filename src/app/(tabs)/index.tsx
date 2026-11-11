import { useTranslation } from 'react-i18next';

import { CampScene, Card, EmptyState, Screen } from '@/components';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen subtitle={t('home.subtitle')} title={t('home.title')}>
      <Card flush>
        <CampScene label={t('home.campAlt')} />
      </Card>

      <Card tone="cardAlt">
        <EmptyState body={t('home.emptyBody')} icon="podium-outline" title={t('home.emptyTitle')} />
      </Card>
    </Screen>
  );
}
