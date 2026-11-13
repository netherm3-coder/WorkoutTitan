import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DayStepper, Icon, Screen, TextField } from '@/components';
import { BODY_PARTS, dayOf, type BodyPart } from '@/domain';
import { decimalsOf, lengthFrom, parseDecimal, roundTo, useFormat, weightFrom, weightIn } from '@/format';
import { useRecords } from '@/records';
import { minTouchTarget, spacing } from '@/theme';

/** How many of the latest weigh-ins are listed. */
const RECENT = 7;

const isBuiltInPart = (part: string): part is BodyPart => (BODY_PARTS as readonly string[]).includes(part);

export default function BodyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { history, measurements, profile, saveBodyWeight, deleteBodyWeight, saveProfile } = useRecords();

  const today = dayOf(new Date());
  const [day, setDay] = useState(today);
  const [weight, setWeight] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  // Weigh-ins come oldest first.
  const { weights } = history;
  const latest = weights[weights.length - 1];
  const previous = weights[weights.length - 2];
  const change = latest && previous ? latest.kg - previous.kg : null;
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
    const typed = parseDecimal(weight);
    if (typed === null || typed <= 0) {
      setProblem(t('body.invalidWeight'));
      return;
    }
    attempt(saveBodyWeight({ date: day, kg: weightFrom(typed, format.units.weight) }).then(() => setWeight('')));
  };

  /** A change of weight with its sign, unless it rounds to nothing in the chosen unit. */
  const signed = (kg: number) => {
    const unit = format.units.weight;
    const visible = roundTo(weightIn(Math.abs(kg), unit), decimalsOf(unit)) > 0;
    return `${visible ? (kg > 0 ? '+' : '−') : ''}${format.weight(Math.abs(kg))}`;
  };

  return (
    <Screen subtitle={t('body.subtitle')} title={t('body.title')}>
      <Card tone="cardAlt">
        <AppText variant="heading">{t('body.weight')}</AppText>
        {latest ? (
          <View accessibilityLabel={`${t('body.weight')}: ${format.weight(latest.kg)}`} accessible>
            <AppText variant="display">{format.weight(latest.kg)}</AppText>
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
        <TextField
          keyboardType="decimal-pad"
          label={t('body.weightField', { unit: format.weightUnit })}
          onChangeText={setWeight}
          value={weight}
        />
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
                <AppText strong>{format.weight(record.kg)}</AppText>
                <Pressable
                  accessibilityLabel={t('body.deleteWeight', { day: format.day(record.date, today) })}
                  accessibilityRole="button"
                  onPress={() => attempt(deleteBodyWeight(record.date))}
                  style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                >
                  <Icon name="close" />
                </Pressable>
              </View>
            ))}
        </Card>
      ) : null}

      {/* Filled again in the new unit when the unit changes. */}
      <HeightCard
        key={format.units.length}
        heightCm={profile.heightCm}
        onSave={(heightCm) => attempt(saveProfile({ heightCm }))}
        onInvalid={() => setProblem(t('body.invalidHeight'))}
      />

      <Card>
        <AppText variant="heading">{t('body.measurements')}</AppText>
        {latestParts.length === 0 ? <AppText color="muted">{t('body.noMeasurements')}</AppText> : null}
        {latestParts.map(([part, { cm, date }]) => {
          const name = isBuiltInPart(part) ? t(`body.parts.${part}`) : part;
          return (
            <View accessibilityLabel={`${name}: ${format.length(cm)}`} accessible key={part} style={styles.row}>
              <View style={styles.grow}>
                <AppText>{name}</AppText>
                <AppText color="muted" variant="caption">
                  {format.day(date, today)}
                </AppText>
              </View>
              <AppText strong>{format.length(cm)}</AppText>
            </View>
          );
        })}
        <Button label={t('body.measure')} onPress={() => router.push('/measurements')} variant="accent" />
      </Card>
    </Screen>
  );
}

type HeightCardProps = {
  heightCm: number | null;
  onSave: (heightCm: number | null) => Promise<void> | void;
  onInvalid: () => void;
};

/** Height in the chosen unit. Saved back untouched, it keeps the exact value it was filled with. */
function HeightCard({ heightCm, onSave, onInvalid }: HeightCardProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [filled, setFilled] = useState(() => (heightCm === null ? null : { text: format.lengthField(heightCm), cm: heightCm }));
  const [height, setHeight] = useState(filled?.text ?? '');

  const submit = () => {
    const typed = height.trim();
    if (typed === '') {
      setFilled(null);
      void onSave(null);
      return;
    }
    const value = parseDecimal(typed);
    if (value === null || value <= 0) {
      onInvalid();
      return;
    }
    const cm = filled && typed === filled.text ? filled.cm : lengthFrom(value, format.units.length);
    setFilled({ text: typed, cm });
    void onSave(cm);
  };

  return (
    <Card>
      <TextField
        keyboardType="decimal-pad"
        label={t('body.heightField', { unit: format.lengthUnit })}
        onChangeText={setHeight}
        value={height}
      />
      <Button label={t('body.saveHeight')} onPress={submit} variant="accent" />
    </Card>
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
