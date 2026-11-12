import { StyleSheet, View } from 'react-native';

import { radii, useForeground } from '@/theme';
import { withAlpha } from '@/theme/color';

export type ProgressBarProps = {
  /** From 0 to 1. */
  value: number;
  /** What the bar measures, for screen readers. */
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const foreground = useForeground();
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { backgroundColor: withAlpha(foreground.muted, 0.3) }]}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: foreground.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
