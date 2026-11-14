import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StartupError } from '@/components';
import { loadSeenItems, NewItemsProvider } from '@/cosmetics';
import { DatabaseProvider, DatabaseTooNewError, useOpenDatabase } from '@/db';
import { defaultUnits, UnitsProvider } from '@/format';
import { initI18n, pickLanguage } from '@/i18n';
import { createPurchaseStore, loadCachedPremium, PurchasesProvider } from '@/purchases';
import { RecordsProvider } from '@/records';
import { loadSettings, saveLengthUnit, saveThemeId, saveWeightUnit, type StoredSettings } from '@/settings/storage';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

// Keep the splash screen up until fonts, saved settings and the history are in, so the first
// frame is already in the right language and skin, shows real data, dresses the camp in what
// the person paid for and knows which of its items are news.
void SplashScreen.preventAutoHideAsync();

/** Takes the splash screen down. Drawn only once there is something to show under it. */
function Ready() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [settings, setSettings] = useState<StoredSettings | null>(null);
  const [savedPremium, setSavedPremium] = useState(false);
  const [seenItems, setSeenItems] = useState<ReadonlySet<string> | null>(null);
  const [store] = useState(createPurchaseStore);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadSettings(), loadCachedPremium(Date.now()), loadSeenItems()]).then(([saved, premium, seen]) => {
      if (cancelled) return;
      initI18n(saved.language ?? pickLanguage(getLocales()));
      setSavedPremium(premium);
      setSeenItems(seen);
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

  if (!ready) {
    return null;
  }

  // A unit never chosen follows what the phone says about its measurement system.
  const phoneUnits = defaultUnits(getLocales());
  const units = { weight: settings.weightUnit ?? phoneUnits.weight, length: settings.lengthUnit ?? phoneUnits.length };

  return (
    <ThemeProvider initialThemeId={settings.themeId} onThemeChange={saveThemeId}>
      <UnitsProvider initial={units} onLengthUnitChange={saveLengthUnit} onWeightUnitChange={saveWeightUnit}>
        <PurchasesProvider initialPremium={savedPremium} store={store}>
          {opened.status === 'ready' ? (
            <DatabaseProvider value={opened.db}>
              <RecordsProvider renderFailure={(error, again) => <DatabaseFailure error={error} onRetry={again} retrying={false} />}>
                <NewItemsProvider initialSeen={seenItems}>
                  <Ready />
                  <RootStack />
                </NewItemsProvider>
              </RecordsProvider>
            </DatabaseProvider>
          ) : (
            <DatabaseFailure error={opened.error} onRetry={retry} retrying={opened.retrying} />
          )}
        </PurchasesProvider>
      </UnitsProvider>
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
      <Ready />
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
