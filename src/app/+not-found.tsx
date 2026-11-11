import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Screen } from '@/components';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen title={t('notFound.title')}>
      <Button label={t('notFound.action')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
