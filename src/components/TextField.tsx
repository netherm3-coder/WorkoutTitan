import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { minTouchTarget, radii, spacing, typeScale, useForeground, useTheme } from '@/theme';

import { AppText } from './AppText';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** A short remark after the label, such as "optional". */
  remark?: string;
};

/** A labelled input in the colours of the surface it sits on. */
export function TextField({ label, remark, ...rest }: TextFieldProps) {
  const { theme } = useTheme();
  const foreground = useForeground();

  return (
    <View style={styles.field}>
      <AppText variant="label">
        {label}
        {remark ? <AppText color="muted" variant="label">{` (${remark})`}</AppText> : null}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={foreground.muted}
        selectionColor={foreground.accent}
        {...rest}
        style={[
          styles.input,
          rest.multiline && styles.multiline,
          { color: foreground.text, borderColor: foreground.muted, fontFamily: theme.fonts.regular },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    gap: spacing.xs,
  },
  input: {
    ...typeScale.body,
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
