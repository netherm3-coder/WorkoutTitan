import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DayStepper, Screen, TextField } from '@/components';
import { dayOf, type BodyMeasurement, type Day } from '@/domain';
import { lengthFrom, parseDecimal, useFormat } from '@/format';
import { useBodyParts, useRecords, type PartChoice } from '@/records';
import { spacing } from '@/theme';

/** What each field holds, by the id of its body part. */
type Typed = Readonly<Record<string, string>>;

/**
 * Two fields to a row. The built-in parts come in the order of Record's form (neck and
 * shoulders, chest and waist, and so on), then the person's own in the order they were added.
 */
function rowsOf(parts: readonly PartChoice[]): PartChoice[][] {
  const rows: PartChoice[][] = [];
  for (let index = 0; index < parts.length; index += 2) rows.push(parts.slice(index, index + 2));
  return rows;
}

export default function MeasurementsScreen() {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const { measurements, saveBodyMeasurements } = useRecords();
  const { parts } = useBodyParts();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/body'));

  /** What the fields hold for a day: the measurements already taken on it. */
  const typedFor = (date: Day, stored: readonly BodyMeasurement[]): Typed => {
    const typed: Record<string, string> = {};
    for (const item of stored) {
      if (item.date === date) typed[item.part] = format.lengthField(item.cm);
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

    for (const part of parts) {
      const text = (typed[part.id] ?? '').trim();
      // An untouched field is skipped: read back from inches it would come out a hair off.
      if (text === (had[part.id] ?? '')) continue;
      if (text === '') {
        // Emptying a field that had a value clears that measurement.
        values[part.id] = null;
        continue;
      }
      const value = parseDecimal(text);
      if (value === null || value <= 0) {
        setProblem(t('body.invalidMeasurement', { field: part.name }));
        return;
      }
      values[part.id] = lengthFrom(value, format.units.length);
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
          {`${t(`body.measureIn.${format.units.length}`)} ${t('body.measureHint')}`}
        </AppText>
        {rowsOf(parts).map((row) => (
          <View key={row.map((part) => part.id).join()} style={styles.row}>
            {row.map((part) => (
              <TextField
                key={part.id}
                keyboardType="decimal-pad"
                label={part.name}
                onChangeText={(text) => setTyped((current) => ({ ...current, [part.id]: text }))}
                value={typed[part.id] ?? ''}
              />
            ))}
            {/* A lone field keeps the width of its column. */}
            {row.length === 1 ? <View style={styles.spacer} /> : null}
          </View>
        ))}
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
        <Pressable accessibilityRole="link" hitSlop={spacing.sm} onPress={() => router.push('/body-parts')}>
          <AppText color="accent" strong variant="label">
            {t('parts.title')}
          </AppText>
        </Pressable>
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
  spacer: {
    flex: 1,
  },
});
