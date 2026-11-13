import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components';
import { buildPedestal, isTimed, isValidGoal } from '@/domain';
import { joinDuration, parseDecimal, splitDuration, useFormat, weightFrom } from '@/format';
import { fromRouteParam } from '@/navigation';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

export default function GoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const discipline = fromRouteParam(useLocalSearchParams<{ discipline: string }>().discipline) ?? '';
  const { history, goals, setGoal, clearGoal } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const record = useMemo(() => buildPedestal(history).get(discipline), [history, discipline]);
  const current = goals.get(discipline) ?? null;
  const timed = record ? isTimed(record.exercise) : false;
  // A goal for a barbell lift is a weight, typed in the chosen unit.
  const isWeight = record?.exercise.kind === 'weight';

  // What the field was filled with, so an untouched goal is kept exactly as it was.
  const [filled] = useState(() => {
    if (current === null) return '';
    if (isWeight) return format.weightField(current);
    if (!timed) return format.number(current);
    const { minutes } = splitDuration(current);
    return minutes > 0 ? format.number(minutes) : '';
  });
  const [first, setFirst] = useState(filled);
  const [seconds, setSeconds] = useState(() => (current !== null && timed ? format.number(splitDuration(current).seconds) : ''));
  const [problem, setProblem] = useState<string | null>(null);

  if (!record) {
    return (
      <Screen backLabel={t('common.back')} onBack={goBack} title={t('goal.title')}>
        <Card>
          <AppText>{t('goal.gone')}</AppText>
        </Card>
      </Screen>
    );
  }

  const { exercise } = record;
  const numberLabel =
    exercise.kind === 'weight'
      ? t('entry.barWeight', { unit: format.weightUnit })
      : exercise.kind === 'bodyweight'
        ? t('entry.reps')
        : exercise.unit
          ? t('entry.valueIn', { unit: exercise.unit })
          : t('entry.value');

  const attempt = (change: Promise<void>) => {
    setProblem(null);
    change.then(goBack, (error: unknown) => {
      console.warn('Could not save the goal', error);
      setProblem(t('goal.saveFailed'));
    });
  };

  const submit = () => {
    const read = (text: string) => (text.trim() === '' ? null : parseDecimal(text));
    const typed = read(first);
    const target = timed
      ? joinDuration(typed, read(seconds))
      : isWeight && current !== null && first.trim() === filled
        ? current
        : isWeight && typed !== null
          ? weightFrom(typed, format.units.weight)
          : typed;
    const unreadable = [first, ...(timed ? [seconds] : [])].some((text) => text.trim() !== '' && parseDecimal(text) === null);

    if (unreadable || target === null || !isValidGoal(target, exercise)) {
      setProblem(t('goal.invalid'));
      return;
    }
    attempt(setGoal(discipline, target));
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} subtitle={format.discipline(exercise, record.entry)} title={t('goal.title')}>
      <Card tone="cardAlt">
        <AppText>{t('goal.best', { result: format.result(record.entry, exercise) })}</AppText>
        {current !== null ? <AppText color="muted">{t('goal.current', { goal: format.goal(current, exercise) })}</AppText> : null}
      </Card>

      <Card>
        {timed ? (
          <View style={styles.row}>
            <TextField keyboardType="decimal-pad" label={t('entry.minutes')} onChangeText={setFirst} value={first} />
            <TextField keyboardType="decimal-pad" label={t('entry.seconds')} onChangeText={setSeconds} value={seconds} />
          </View>
        ) : (
          <TextField keyboardType="decimal-pad" label={numberLabel} onChangeText={setFirst} value={first} />
        )}
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
      </Card>

      <Button label={t('goal.save')} onPress={submit} />
      {current !== null ? <Button label={t('goal.clear')} onPress={() => attempt(clearGoal(discipline))} variant="danger" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
