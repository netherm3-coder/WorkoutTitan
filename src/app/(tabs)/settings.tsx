import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Card, LinkRow, OptionRow, Screen, ThemeSwatch } from '@/components';
import { countEntries, useDatabase } from '@/db';
import { LANGUAGE_NAMES, LANGUAGES, useLanguage } from '@/i18n';
import { themes, useTheme } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, setThemeId } = useTheme();
  const { language, setLanguage } = useLanguage();
  const version = Constants.expoConfig?.version;
  const entryCount = useEntryCount();

  return (
    <Screen title={t('settings.title')}>
      <Card>
        <AppText variant="heading">{t('settings.language')}</AppText>
        <View accessibilityRole="radiogroup">
          {LANGUAGES.map((code) => (
            <OptionRow
              key={code}
              label={LANGUAGE_NAMES[code]}
              onPress={() => setLanguage(code)}
              selected={code === language}
            />
          ))}
        </View>
      </Card>

      <Card>
        <AppText variant="heading">{t('settings.appearance')}</AppText>
        <View accessibilityRole="radiogroup">
          {themes.map((option) => (
            <OptionRow
              key={option.id}
              description={t(`themes.${option.id}.description`)}
              label={t(`themes.${option.id}.name`)}
              leading={<ThemeSwatch theme={option} />}
              onPress={() => setThemeId(option.id)}
              selected={option.id === theme.id}
            />
          ))}
        </View>
      </Card>

      <Card tone="cardAlt">
        <LinkRow
          hint={t('settings.supportHint')}
          icon="heart"
          label={t('settings.support')}
          onPress={() => router.push('/support')}
        />
      </Card>

      <Card>
        {version ? (
          <AppText color="muted" variant="label">
            {t('settings.version', { version })}
          </AppText>
        ) : null}
        {entryCount !== null ? (
          <AppText color="muted" variant="label">
            {t('settings.entriesOnPhone', { total: entryCount })}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

/** How many entries the database holds; `null` until it has answered. */
function useEntryCount(): number | null {
  const db = useDatabase();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    countEntries(db).then(
      (found) => {
        if (!cancelled) setTotal(found);
      },
      (error: unknown) => console.warn('Could not count entries', error),
    );

    return () => {
      cancelled = true;
    };
  }, [db]);

  return total;
}
