import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { minTouchTarget, spacing, ToneProvider, useTheme } from '@/theme';

import { AppText } from './AppText';

const TAB_SCREEN_EDGES: readonly Edge[] = ['top', 'left', 'right'];
const FULL_SCREEN_EDGES: readonly Edge[] = ['top', 'left', 'right', 'bottom'];

export type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Shows a back button. Screens opened on top of the tabs pass this. */
  onBack?: () => void;
  /** What a screen reader says for the back button. Required together with `onBack`. */
  backLabel?: string;
  /**
   * Keeps the first child in view at the top while the rest scrolls under it: a preview that
   * the controls below it change.
   */
  pinFirst?: boolean;
  children: ReactNode;
};

/**
 * The frame every screen shares: the skin's backdrop, a centred title, and scrolling content.
 * The Titan layout this replaces is `AppShell`.
 */
export function Screen({ title, subtitle, onBack, backLabel, pinFirst = false, children }: ScreenProps) {
  const { theme } = useTheme();
  // The scroll view counts its children without the empty ones: the back button, when there is
  // one, then the header, then the first child of the screen.
  const firstChild = onBack ? 2 : 1;

  return (
    <View style={styles.root}>
      <LinearGradient colors={theme.backdrop.gradient} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: theme.backdrop.scrim }]} />

      <ToneProvider tone="backdrop">
        <SafeAreaView edges={onBack ? FULL_SCREEN_EDGES : TAB_SCREEN_EDGES} style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={pinFirst ? [firstChild] : undefined}
          >
            {onBack ? (
              <Pressable
                accessibilityLabel={backLabel}
                accessibilityRole="button"
                hitSlop={spacing.sm}
                onPress={onBack}
                style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              >
                <Ionicons color={theme.backdrop.heading} name="chevron-back" size={26} />
              </Pressable>
            ) : null}

            <View style={styles.header}>
              <AppText align="center" variant="display">
                {title}
              </AppText>
              {subtitle ? (
                <AppText align="center" color="muted">
                  {subtitle}
                </AppText>
              ) : null}
            </View>

            {children}
          </ScrollView>
        </SafeAreaView>
      </ToneProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    pointerEvents: 'none',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  back: {
    // Sits on its own row so a long title keeps the full width.
    alignSelf: 'flex-start',
    width: minTouchTarget,
    height: minTouchTarget,
    marginLeft: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
