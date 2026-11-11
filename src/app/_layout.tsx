import { useFonts } from 'expo-font';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initI18n, pickLanguage } from '@/i18n';
import { loadSettings, saveThemeId, type StoredSettings } from '@/settings/storage';
import { fontAssets, ThemeProvider, useTheme } from '@/theme';

// Keep the splash screen up until fonts and saved settings are in, so the first frame is
// already in the right language and skin.
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

  const ready = settings !== null && (fontsLoaded || fontError !== null);

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
      <RootStack />
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
