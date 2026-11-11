import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components';

export default function SupportScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  // Opened from a link there is nothing to go back to, so return to the tabs instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('support.title')}>
      <Card tone="cardAlt">
        <AppText>{t('support.body')}</AppText>
      </Card>
    </Screen>
  );
}
