import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { radii, spacing, typeScale, useForeground, useTheme } from '@/theme';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /**
   * `primary` is the main action on a screen; `accent` is the warm highlight colour; `danger`
   * is an outline for actions that take something away.
   */
  variant?: 'primary' | 'accent' | 'danger';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  const { theme } = useTheme();
  const foreground = useForeground();
  const colors =
    variant === 'danger'
      ? { background: 'transparent', border: foreground.danger, text: foreground.danger }
      : theme.button[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: colors.text, fontFamily: theme.fonts.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: {
    ...typeScale.heading,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
