import { useTranslation } from 'react-i18next';

import { Card, EmptyState, Screen } from '@/components';

export default function BodyScreen() {
  const { t } = useTranslation();

  return (
    <Screen subtitle={t('body.subtitle')} title={t('body.title')}>
      <Card>
        <EmptyState body={t('body.emptyBody')} icon="scale-outline" title={t('body.emptyTitle')} />
      </Card>
    </Screen>
  );
}
