import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DayStepper, Screen, TextField } from '@/components';
import { BODY_PARTS, dayOf, type BodyMeasurement, type BodyPart, type Day } from '@/domain';
import { formatNumber, parseDecimal } from '@/format';
import { useLanguage } from '@/i18n';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

type Typed = Record<BodyPart, string>;

/** Two fields to a row, in the order Record's form had them. */
const ROWS: readonly (readonly BodyPart[])[] = [
  ['neck', 'shoulders'],
  ['chest', 'waist'],
  ['bicep', 'forearm'],
  ['thigh', 'calf'],
];

export default function MeasurementsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { measurements, saveBodyMeasurements } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/body'));

  /** What the fields hold for a day: the measurements already taken on it. */
  const typedFor = (date: Day, stored: readonly BodyMeasurement[]): Typed => {
    const typed = Object.fromEntries(BODY_PARTS.map((part) => [part, ''])) as Typed;
    for (const item of stored) {
      if (item.date === date && item.part in typed) typed[item.part as BodyPart] = formatNumber(item.cm, language);
    }
    return typed;
  };

  const today = dayOf(new Date());
  const [day, setDay] = useState(today);
  const [typed, setTyped] = useState(() => typedFor(today, measurements));
  const [problem, setProblem] = useState<string | null>(null);

  const changeDay = (next: Day) => {
    setDay(next);
    setTyped(typedFor(next, measurements));
    setProblem(null);
  };

  const submit = () => {
    const had = typedFor(day, measurements);
    const values: Record<string, number | null> = {};

    for (const part of BODY_PARTS) {
      const text = typed[part].trim();
      if (text === '') {
        // Emptying a field that had a value clears that measurement; an untouched one is skipped.
        if (had[part] !== '') values[part] = null;
        continue;
      }
      const cm = parseDecimal(text);
      if (cm === null || cm <= 0) {
        setProblem(t('body.invalidMeasurement', { field: t(`body.parts.${part}`) }));
        return;
      }
      values[part] = cm;
    }

    setProblem(null);
    saveBodyMeasurements(day, values).then(goBack, (error: unknown) => {
      console.warn('Could not save measurements', error);
      setProblem(t('body.saveFailed'));
    });
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('body.measureTitle')}>
      <Card>
        <DayStepper day={day} onChange={changeDay} today={today} />
        <AppText color="muted" variant="label">
          {t('body.measureHint')}
        </AppText>
        {ROWS.map((row) => (
          <View key={row.join()} style={styles.row}>
            {row.map((part) => (
              <TextField
                key={part}
                keyboardType="decimal-pad"
                label={t(`body.parts.${part}`)}
                onChangeText={(text) => setTyped((current) => ({ ...current, [part]: text }))}
                value={typed[part]}
              />
            ))}
          </View>
        ))}
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
      </Card>

      <Button label={t('body.saveMeasurements')} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
