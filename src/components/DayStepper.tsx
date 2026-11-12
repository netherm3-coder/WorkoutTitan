import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, type Day } from '@/domain';
import { formatDay } from '@/format/dates';
import { minTouchTarget, useForeground } from '@/theme';

import { AppText } from './AppText';

export type DayStepperProps = {
  day: Day;
  today: Day;
  onChange: (day: Day) => void;
};

/** Picks a day by stepping back from today. Days that have not come cannot be picked. */
export function DayStepper({ day, today, onChange }: DayStepperProps) {
  const { t } = useTranslation();
  const foreground = useForeground();
  const atToday = day >= today;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={t('entry.previousDay')}
        accessibilityRole="button"
        onPress={() => onChange(addDays(day, -1))}
        style={({ pressed }) => [styles.step, pressed && styles.pressed]}
      >
        <Ionicons color={foreground.accent} name="chevron-back" size={24} />
      </Pressable>
      <AppText align="center" strong style={styles.label}>
        {formatDay(day, today, t)}
      </AppText>
      <Pressable
        accessibilityLabel={t('entry.nextDay')}
        accessibilityRole="button"
        accessibilityState={{ disabled: atToday }}
        disabled={atToday}
        onPress={() => onChange(addDays(day, 1))}
        style={({ pressed }) => [styles.step, pressed && styles.pressed, atToday && styles.disabled]}
      >
        <Ionicons color={foreground.accent} name="chevron-forward" size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  step: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});
