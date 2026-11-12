import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components';
import { dayOf, isDay, type Day } from '@/domain';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

type Field = 'trainingSince' | 'soberSince';
type Typed = { day: string; month: string; year: string };

const typedFrom = (date: Day | null): Typed => {
  if (!date) return { day: '', month: '', year: '' };
  const [year = '', month = '', day = ''] = date.split('-');
  return { day: String(Number(day)), month: String(Number(month)), year };
};

/** The day that was typed, or `null` if it is not a real one. */
const dayFrom = ({ day, month, year }: Typed): Day | null => {
  if (![day, month, year].every((part) => /^\d+$/.test(part.trim()))) return null;
  const date = `${year.trim().padStart(4, '0')}-${month.trim().padStart(2, '0')}-${day.trim().padStart(2, '0')}`;
  return isDay(date) ? date : null;
};

export default function CountersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, saveProfile } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const [typed, setTyped] = useState<Record<Field, Typed>>({
    trainingSince: typedFrom(profile.trainingSince),
    soberSince: typedFrom(profile.soberSince),
  });
  const [problem, setProblem] = useState<{ field: Field; text: string } | null>(null);

  const attempt = (field: Field, value: Day | null) => {
    setProblem(null);
    saveProfile({ [field]: value }).catch((error: unknown) => {
      console.warn('Could not save the counter', error);
      setProblem({ field, text: t('counters.saveFailed') });
    });
  };

  const save = (field: Field) => {
    const date = dayFrom(typed[field]);
    if (date === null || date > dayOf(new Date())) {
      setProblem({ field, text: t('counters.invalidDate') });
      return;
    }
    attempt(field, date);
  };

  const turnOff = (field: Field) => {
    setTyped((current) => ({ ...current, [field]: typedFrom(null) }));
    attempt(field, null);
  };

  const section = (field: Field, title: string, hint?: string) => (
    <Card>
      <AppText variant="heading">{title}</AppText>
      {hint ? (
        <AppText color="muted" variant="label">
          {hint}
        </AppText>
      ) : null}
      <View accessibilityLabel={title} style={styles.row}>
        {(['day', 'month', 'year'] as const).map((part) => (
          <TextField
            accessibilityLabel={`${title}: ${t(`counters.${part}`)}`}
            key={part}
            keyboardType="number-pad"
            label={t(`counters.${part}`)}
            onChangeText={(text) => setTyped((current) => ({ ...current, [field]: { ...current[field], [part]: text } }))}
            value={typed[field][part]}
          />
        ))}
      </View>
      {problem?.field === field ? (
        <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
          {problem.text}
        </AppText>
      ) : null}
      <Button accessibilityLabel={`${title}: ${t('counters.save')}`} label={t('counters.save')} onPress={() => save(field)} />
      {profile[field] ? (
        <Button
          accessibilityLabel={`${title}: ${t('counters.off')}`}
          label={t('counters.off')}
          onPress={() => turnOff(field)}
          variant="danger"
        />
      ) : null}
    </Card>
  );

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('counters.title')}>
      {section('trainingSince', t('counters.trainingSince'))}
      {section('soberSince', t('counters.soberSince'), t('counters.soberHint'))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
