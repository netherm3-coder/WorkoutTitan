import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, Screen, TextField } from '@/components';
import { changeExercise, choosesDirection, type Direction, type Exercise } from '@/domain';
import { useFormat } from '@/format';
import { fromRouteParam } from '@/navigation';
import { namesakeOf, useRecords } from '@/records';
import { spacing } from '@/theme';

export default function EditExerciseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const id = fromRouteParam(useLocalSearchParams<{ id: string }>().id);
  const { exercises } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/exercises'));

  // Kept from the first look, so the form keeps its values while the screen closes after saving.
  const [exercise] = useState(() => exercises.find((item) => item.id === id && !item.builtIn));

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('own.editTitle')}>
      {exercise ? (
        <ExerciseForm exercise={exercise} onSaved={goBack} />
      ) : (
        <Card>
          <AppText>{t('own.gone')}</AppText>
        </Card>
      )}
    </Screen>
  );
}

function ExerciseForm({ exercise, onSaved }: { exercise: Exercise; onSaved: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { exercises, updateExercise } = useRecords();

  const [name, setName] = useState(exercise.name ?? '');
  const [better, setBetter] = useState<Direction>(exercise.better ?? 'higher');
  const [unit, setUnit] = useState(exercise.unit ?? '');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'm'>(exercise.distanceUnit ?? 'km');
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const direction = choosesDirection(exercise.kind);

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      setProblem(t('own.nameRequired'));
      return;
    }
    if (namesakeOf(trimmed, exercises, format.exercise, exercise.id)) {
      setProblem(t('own.nameTaken'));
      return;
    }

    setProblem(null);
    setSaving(true);
    updateExercise(changeExercise(exercise, { name: trimmed, better, unit, distanceUnit })).then(onSaved, (error: unknown) => {
      console.warn('Could not save the exercise', error);
      setSaving(false);
      setProblem(t('own.saveFailed'));
    });
  };

  return (
    <Card>
      <TextField label={t('own.name')} onChangeText={setName} value={name} />

      <View style={styles.block}>
        <AppText variant="label">{t('own.kind')}</AppText>
        <AppText strong>{t(`own.kinds.${exercise.kind === 'shuttle' ? 'distanceTime' : exercise.kind}`)}</AppText>
        <AppText color="muted" variant="label">
          {t('own.kindFixed')}
        </AppText>
      </View>

      {exercise.kind === 'distanceTime' ? (
        <View style={styles.block}>
          <AppText variant="label">{t('own.distanceIn')}</AppText>
          <View accessibilityLabel={t('own.distanceIn')} accessibilityRole="radiogroup" style={styles.chips}>
            <Chip label={t('own.kilometres')} onPress={() => setDistanceUnit('km')} selected={distanceUnit === 'km'} />
            <Chip label={t('own.metres')} onPress={() => setDistanceUnit('m')} selected={distanceUnit === 'm'} />
          </View>
        </View>
      ) : null}

      {direction ? (
        <View style={styles.block}>
          <AppText variant="label">{t('own.better')}</AppText>
          <View accessibilityLabel={t('own.better')} accessibilityRole="radiogroup" style={styles.chips}>
            <Chip label={t('own.higher')} onPress={() => setBetter('higher')} selected={better === 'higher'} />
            <Chip label={t('own.lower')} onPress={() => setBetter('lower')} selected={better === 'lower'} />
          </View>
          {better !== exercise.better ? (
            <AppText accessibilityLiveRegion="polite" color="muted" variant="label">
              {t('own.directionHint')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {exercise.kind === 'count' ? (
        <TextField label={t('own.unit')} onChangeText={setUnit} remark={t('entry.optional')} value={unit} />
      ) : null}

      {problem ? (
        <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
          {problem}
        </AppText>
      ) : null}
      <Button disabled={saving} label={t('own.save')} onPress={save} />
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
