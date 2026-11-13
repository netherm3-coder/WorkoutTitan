import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Card, LinkRow, OptionRow, Screen, ThemeSwatch } from '@/components';
import { LANGUAGE_NAMES, LANGUAGES, useLanguage } from '@/i18n';
import { useRecords } from '@/records';
import { themes, useTheme } from '@/theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme, setThemeId } = useTheme();
  const { language, setLanguage } = useLanguage();
  const version = Constants.expoConfig?.version;
  const entryCount = useRecords().history.entries.length;

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

      <Card>
        <LinkRow
          hint={t('settings.campHint')}
          icon="color-palette-outline"
          label={t('settings.camp')}
          onPress={() => router.push('/camp')}
        />
        <LinkRow
          hint={t('settings.exercisesHint')}
          icon="list"
          label={t('settings.exercises')}
          onPress={() => router.push('/exercises')}
        />
        <LinkRow
          hint={t('settings.countersHint')}
          icon="hourglass-outline"
          label={t('settings.counters')}
          onPress={() => router.push('/counters')}
        />
        <LinkRow
          hint={t('settings.backupHint')}
          icon="save-outline"
          label={t('settings.backup')}
          onPress={() => router.push('/backup')}
        />
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
        <AppText color="muted" variant="label">
          {t('settings.entriesOnPhone', { total: entryCount })}
        </AppText>
      </Card>
    </Screen>
  );
}
