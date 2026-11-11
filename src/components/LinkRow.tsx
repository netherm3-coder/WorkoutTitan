import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, spacing, useForeground } from '@/theme';

import { AppText } from './AppText';

export type LinkRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
};

/** A row that opens another screen. Place it inside a `Card`. */
export function LinkRow({ icon, label, hint, onPress }: LinkRowProps) {
  const foreground = useForeground();

  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons color={foreground.accent} name={icon} size={26} />
      <View style={styles.text}>
        <AppText strong>{label}</AppText>
        {hint ? (
          <AppText color="muted" variant="label">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Ionicons color={foreground.muted} name="chevron-forward" size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
