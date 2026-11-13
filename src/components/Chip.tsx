import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radii, spacing, typeScale, useForeground, useTheme } from '@/theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** A small mark in front of the label, such as a lock on a choice that is not open yet. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** What a screen reader says, when the label alone does not say enough. */
  accessibilityLabel?: string;
};

/** One choice in a row of short options, such as the exercise of a new result. */
export function Chip({ label, selected, onPress, icon, accessibilityLabel }: ChipProps) {
  const { theme } = useTheme();
  const foreground = useForeground();
  const chosen = theme.button.primary;
  const color = selected ? chosen.text : foreground.text;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? chosen.border : foreground.muted },
        selected && { backgroundColor: chosen.background },
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Ionicons color={color} name={icon} size={14} /> : null}
      <Text style={[styles.label, { color, fontFamily: theme.fonts.medium }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  label: {
    ...typeScale.label,
  },
  pressed: {
    opacity: 0.7,
  },
});
