import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, Icon, Screen, TextField } from '@/components';
import { customExercise, type Direction, type Exercise, type ExerciseKind } from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { minTouchTarget, spacing } from '@/theme';

/** The kinds a person can pick. Shuttle runs are covered by the built-in exercise. */
const KINDS = ['bodyweight', 'weight', 'distanceTime', 'duration', 'count', 'text'] as const satisfies readonly ExerciseKind[];

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { history, exercises, addExercise, deleteExercise } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const [name, setName] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]>('bodyweight');
  const [better, setBetter] = useState<Direction>('higher');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>('km');
  const [unit, setUnit] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const own = exercises.filter((exercise) => !exercise.builtIn);
  const entriesOf = (exercise: Exercise) => history.entries.filter((entry) => entry.exerciseId === exercise.id).length;

  // Only a time or a number can go either way; the rest have one natural direction.
  const choosesDirection = kind === 'duration' || kind === 'count';

  const pickKind = (next: (typeof KINDS)[number]) => {
    setKind(next);
    // A time on its own is usually a race, a number is usually the more the better.
    setBetter(next === 'duration' ? 'lower' : 'higher');
  };

  const attempt = (change: Promise<void>, then?: () => void) => {
    setProblem(null);
    change.then(then, (error: unknown) => {
      console.warn('Could not save the exercise', error);
      setProblem(t('own.saveFailed'));
    });
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      setProblem(t('own.nameRequired'));
      return;
    }
    if (exercises.some((exercise) => format.exercise(exercise).toLowerCase() === trimmed.toLowerCase())) {
      setProblem(t('own.nameTaken'));
      return;
    }

    const { id: _id, builtIn: _builtIn, ...exercise } = customExercise({
      id: '',
      name: trimmed,
      kind,
      better: choosesDirection ? better : undefined,
      unit,
      distanceUnit,
    });
    attempt(addExercise(exercise), () => {
      setName('');
      setUnit('');
    });
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('own.title')}>
      <Card tone="cardAlt">
        {own.length === 0 ? <AppText color="muted">{t('own.empty')}</AppText> : null}
        {own.map((exercise) =>
          confirming === exercise.id ? (
            <View key={exercise.id} style={styles.confirm}>
              <AppText>
                {entriesOf(exercise) === 0
                  ? t('own.confirmDeleteUnused', { name: exercise.name })
                  : t('own.confirmDelete', { name: exercise.name, count: entriesOf(exercise) })}
              </AppText>
              <Button
                label={t('own.confirm')}
                onPress={() => attempt(deleteExercise(exercise.id), () => setConfirming(null))}
                variant="danger"
              />
              <Button label={t('own.cancel')} onPress={() => setConfirming(null)} variant="accent" />
            </View>
          ) : (
            <View key={exercise.id} style={styles.row}>
              <View style={styles.grow}>
                <AppText strong>{exercise.name}</AppText>
                <AppText color="muted" variant="label">
                  {t(`own.kinds.${exercise.kind === 'shuttle' ? 'distanceTime' : exercise.kind}`)}
                </AppText>
              </View>
              <Pressable
                accessibilityLabel={t('own.delete', { name: exercise.name })}
                accessibilityRole="button"
                onPress={() => setConfirming(exercise.id)}
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
              >
                <Icon name="trash-outline" />
              </Pressable>
            </View>
          ),
        )}
      </Card>

      <Card>
        <AppText variant="heading">{t('own.new')}</AppText>
        <TextField label={t('own.name')} onChangeText={setName} value={name} />

        <AppText variant="label">{t('own.kind')}</AppText>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {KINDS.map((item) => (
            <Chip key={item} label={t(`own.kinds.${item}`)} onPress={() => pickKind(item)} selected={item === kind} />
          ))}
        </View>

        {kind === 'distanceTime' ? (
          <>
            <AppText variant="label">{t('own.distanceIn')}</AppText>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              <Chip label={t('own.kilometres')} onPress={() => setDistanceUnit('km')} selected={distanceUnit === 'km'} />
              <Chip label={t('own.metres')} onPress={() => setDistanceUnit('m')} selected={distanceUnit === 'm'} />
            </View>
          </>
        ) : null}

        {choosesDirection ? (
          <>
            <AppText variant="label">{t('own.better')}</AppText>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              <Chip label={t('own.higher')} onPress={() => setBetter('higher')} selected={better === 'higher'} />
              <Chip label={t('own.lower')} onPress={() => setBetter('lower')} selected={better === 'lower'} />
            </View>
          </>
        ) : null}

        {kind === 'count' ? (
          <TextField label={t('own.unit')} onChangeText={setUnit} remark={t('entry.optional')} value={unit} />
        ) : null}

        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
        <Button label={t('own.add')} onPress={submit} />
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
  confirm: {
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
