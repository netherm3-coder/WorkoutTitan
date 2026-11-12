import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StartupError } from '@/components';
import { DatabaseProvider, DatabaseTooNewError, useOpenDatabase } from '@/db';
import { initI18n, pickLanguage } from '@/i18n';
import { loadSettings, saveThemeId, type StoredSettings } from '@/settings/storage';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

// Keep the splash screen up until fonts, saved settings and the database are in, so the first
// frame is already in the right language and skin and has data behind it.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [settings, setSettings] = useState<StoredSettings | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadSettings().then((saved) => {
      if (cancelled) return;
      initI18n(saved.language ?? pickLanguage(getLocales()));
      setSettings(saved);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontError) {
      // The app stays usable with system fonts.
      console.warn('Could not load fonts', fontError);
    }
  }, [fontError]);

  const { state: opened, retry } = useOpenDatabase();
  const ready = settings !== null && (fontsLoaded || fontError !== null) && opened.status !== 'opening';

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider initialThemeId={settings.themeId} onThemeChange={saveThemeId}>
      {opened.status === 'ready' ? (
        <DatabaseProvider value={opened.db}>
          <RootStack />
        </DatabaseProvider>
      ) : (
        <DatabaseFailure error={opened.error} onRetry={retry} retrying={opened.retrying} />
      )}
    </ThemeProvider>
  );
}

function RootStack() {
  const { theme } = useTheme();
  // Painted behind screens while they slide, so transitions never flash another colour.
  const underlay = theme.backdrop.gradient[0];

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: underlay } }} />
    </>
  );
}

/** Without its data the app has nothing to show, so it says what went wrong instead. */
function DatabaseFailure({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying: boolean }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Trying again cannot help with data from a newer version; only an update can.
  const tooNew = error instanceof DatabaseTooNewError;
  const message = error instanceof Error ? error.message : String(error);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <StartupError
        action={tooNew ? undefined : { label: t('startup.retry'), onPress: onRetry, busy: retrying }}
        body={t(tooNew ? 'startup.tooNewBody' : 'startup.failedBody')}
        details={tooNew ? undefined : t('startup.details', { message })}
        title={t('startup.failedTitle')}
      />
    </>
  );
}
