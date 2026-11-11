import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing, ToneProvider, useTheme } from '@/theme';

export type CardProps = ViewProps & {
  /** `card` is the skin's main surface; `cardAlt` is the contrasting one. */
  tone?: 'card' | 'cardAlt';
  /** Drops the inner padding, for content that runs edge to edge such as a picture. */
  flush?: boolean;
};

/** A surface from the current skin. Text inside picks its colours to match automatically. */
export function Card({ tone = 'card', flush = false, style, children, ...rest }: CardProps) {
  const { theme } = useTheme();
  const surface = theme[tone];

  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: surface.background, borderColor: surface.border },
        flush && styles.flush,
        style,
      ]}
    >
      <ToneProvider tone={tone}>{children}</ToneProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg + 2,
    gap: spacing.md,
  },
  flush: {
    padding: 0,
    overflow: 'hidden',
  },
});
