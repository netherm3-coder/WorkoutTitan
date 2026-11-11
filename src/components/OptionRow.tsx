import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouchTarget, spacing, useForeground } from '@/theme';

import { AppText } from './AppText';

export type OptionRowProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Shown before the label, for example a colour sample. */
  leading?: ReactNode;
};

/** One choice in a pick-one list, such as a language or a theme. */
export function OptionRow({ label, description, selected, onPress, leading }: OptionRowProps) {
  const foreground = useForeground();

  return (
    <Pressable
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {leading}
      <View style={styles.text}>
        <AppText strong>{label}</AppText>
        {description ? (
          <AppText color="muted" variant="label">
            {description}
          </AppText>
        ) : null}
      </View>
      <Ionicons
        color={selected ? foreground.accent : foreground.muted}
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={24}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
