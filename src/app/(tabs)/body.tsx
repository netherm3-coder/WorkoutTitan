import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DayStepper, Screen, TextField } from '@/components';
import { BODY_PARTS, dayOf, type BodyPart } from '@/domain';
import { parseDecimal, useFormat } from '@/format';
import { useRecords } from '@/records';
import { minTouchTarget, spacing, useForeground } from '@/theme';

/** How many of the latest weigh-ins are listed. */
const RECENT = 7;

const isBuiltInPart = (part: string): part is BodyPart => (BODY_PARTS as readonly string[]).includes(part);

export default function BodyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const foreground = useForeground();
  const { history, measurements, profile, saveBodyWeight, deleteBodyWeight, saveProfile } = useRecords();

  const today = dayOf(new Date());
  const [day, setDay] = useState(today);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState(profile.heightCm === null ? '' : format.number(profile.heightCm));
  const [problem, setProblem] = useState<string | null>(null);

  // Weigh-ins come oldest first.
  const { weights } = history;
  const latest = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const change = latest && previous ? Math.round((latest.kg - previous.kg) * 10) / 10 : null;
  const bmi = latest && profile.heightCm ? latest.kg / (profile.heightCm / 100) ** 2 : null;

  // The latest value of every body part that was ever measured, in the order of the form.
  const latestParts = useMemo(() => {
    const found = new Map<string, { cm: number; date: string }>();
    for (const item of measurements) found.set(item.part, { cm: item.cm, date: item.date });

    const order = (part: string) => {
      const index = (BODY_PARTS as readonly string[]).indexOf(part);
      return index < 0 ? BODY_PARTS.length : index;
    };
    return [...found.entries()].sort(([a], [b]) => order(a) - order(b));
  }, [measurements]);

  const attempt = (action: Promise<void>) => {
    setProblem(null);
    action.catch((error: unknown) => {
      console.warn('Could not save body data', error);
      setProblem(t('body.saveFailed'));
    });
  };

  const submitWeight = () => {
    const kg = parseDecimal(weight);
    if (kg === null || kg <= 0) {
      setProblem(t('body.invalidWeight'));
      return;
    }
    attempt(saveBodyWeight({ date: day, kg }).then(() => setWeight('')));
  };

  const submitHeight = () => {
    const cm = height.trim() === '' ? null : parseDecimal(height);
    if (height.trim() !== '' && (cm === null || cm <= 0)) {
      setProblem(t('body.invalidHeight'));
      return;
    }
    attempt(saveProfile({ heightCm: cm }));
  };

  const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${format.number(Math.abs(value))}`;

  return (
    <Screen subtitle={t('body.subtitle')} title={t('body.title')}>
      <Card tone="cardAlt">
        <AppText variant="heading">{t('body.weight')}</AppText>
        {latest ? (
          <View accessibilityLabel={`${t('body.weight')}: ${format.number(latest.kg)} ${t('units.kg')}`} accessible>
            <AppText variant="display">{`${format.number(latest.kg)} ${t('units.kg')}`}</AppText>
            <AppText color="muted" variant="label">
              {format.day(latest.date, today)}
            </AppText>
          </View>
        ) : (
          <AppText color="muted">{t('body.noWeight')}</AppText>
        )}
        {change !== null ? (
          <AppText color="muted" variant="label">
            {t('body.sincePrevious', { change: signed(change) })}
          </AppText>
        ) : null}
        {bmi !== null ? <AppText variant="label">{t('body.bmi', { value: format.number(Math.round(bmi * 10) / 10) })}</AppText> : null}
      </Card>

      <Card>
        <DayStepper day={day} onChange={setDay} today={today} />
        <TextField keyboardType="decimal-pad" label={t('body.weightKg')} onChangeText={setWeight} value={weight} />
        <Button label={t('body.saveWeight')} onPress={submitWeight} />
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
      </Card>

      {weights.length > 0 ? (
        <Card>
          <AppText variant="heading">{t('body.recent')}</AppText>
          {weights
            .slice(-RECENT)
            .reverse()
            .map((record) => (
              <View key={record.date} style={styles.row}>
                <AppText style={styles.grow}>{format.day(record.date, today)}</AppText>
                <AppText strong>{`${format.number(record.kg)} ${t('units.kg')}`}</AppText>
                <Pressable
                  accessibilityLabel={t('body.deleteWeight', { day: format.day(record.date, today) })}
                  accessibilityRole="button"
                  onPress={() => attempt(deleteBodyWeight(record.date))}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <Ionicons color={foreground.muted} name="close" size={20} />
                </Pressable>
              </View>
            ))}
        </Card>
      ) : null}

      <Card>
        <TextField keyboardType="decimal-pad" label={t('body.heightCm')} onChangeText={setHeight} value={height} />
        <Button label={t('body.saveHeight')} onPress={submitHeight} variant="accent" />
      </Card>

      <Card>
        <AppText variant="heading">{t('body.measurements')}</AppText>
        {latestParts.length === 0 ? <AppText color="muted">{t('body.noMeasurements')}</AppText> : null}
        {latestParts.map(([part, { cm, date }]) => {
          const name = isBuiltInPart(part) ? t(`body.parts.${part}`) : part;
          return (
            <View accessibilityLabel={`${name}: ${format.number(cm)} ${t('units.cm')}`} accessible key={part} style={styles.row}>
              <View style={styles.grow}>
                <AppText>{name}</AppText>
                <AppText color="muted" variant="caption">
                  {format.day(date, today)}
                </AppText>
              </View>
              <AppText strong>{`${format.number(cm)} ${t('units.cm')}`}</AppText>
            </View>
          );
        })}
        <Button label={t('body.measure')} onPress={() => router.push('/measurements')} variant="accent" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  remove: {
    width: minTouchTarget,
    height: minTouchTarget,
    marginRight: -spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
