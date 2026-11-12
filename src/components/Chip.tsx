import { Pressable, StyleSheet, Text } from 'react-native';

import { radii, spacing, typeScale, useForeground, useTheme } from '@/theme';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** One choice in a row of short options, such as the exercise of a new result. */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { theme } = useTheme();
  const foreground = useForeground();
  const chosen = theme.button.primary;

  return (
    <Pressable
      accessibilityLabel={label}
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
      <Text style={[styles.label, { color: selected ? chosen.text : foreground.text, fontFamily: theme.fonts.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  label: {
    ...typeScale.label,
  },
  pressed: {
    opacity: 0.7,
  },
});
