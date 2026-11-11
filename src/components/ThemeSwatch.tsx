import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { radii, useForeground, type Theme } from '@/theme';
import { withAlpha } from '@/theme/color';

/** A thumbnail of a skin: its sky, both card colours and its accent. */
export function ThemeSwatch({ theme }: { theme: Theme }) {
  // An outline in the surrounding text colour keeps a light sample visible on a light card.
  const outline = withAlpha(useForeground().muted, 0.35);

  return (
    <View style={[styles.frame, { borderColor: outline }]}>
      <LinearGradient colors={theme.backdrop.gradient} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backdrop.scrim }]} />
      <View style={[styles.card, { backgroundColor: theme.card.background, borderColor: theme.card.border }]}>
        <View style={[styles.dot, { backgroundColor: theme.card.accent }]} />
      </View>
      <View
        style={[styles.card, { backgroundColor: theme.cardAlt.background, borderColor: theme.cardAlt.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 6,
    gap: 4,
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
