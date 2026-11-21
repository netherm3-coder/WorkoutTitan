import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components';

/** The rules of the sport part, in the order a person meets them: results, then the body. */
const SECTIONS = ['index', 'oneRepMax', 'status', 'disciplines', 'goals', 'chart', 'bmi', 'bodyMap', 'counters'] as const;

/**
 * How the app counts, as Record's "How does it work?" told it: the strength index, the one-rep
 * max, the sport status and the rest. Only the sport part: Record's other sections are not here.
 */
export default function HowItWorksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // Opened from a link there is nothing to go back to, so return to the settings instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} subtitle={t('help.subtitle')} title={t('help.title')}>
      {SECTIONS.map((section) => (
        <Card key={section}>
          {/* Headings, so that a screen reader can jump from rule to rule on a long page. */}
          <AppText accessibilityRole="header" variant="heading">
            {t(`help.sections.${section}.title`)}
          </AppText>
          <AppText>{t(`help.sections.${section}.body`)}</AppText>
        </Card>
      ))}
    </Screen>
  );
}
