import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Chip, TextField } from '@/components';
import { addDays, dayOf, type Exercise, type Measures } from '@/domain';
import { useFormat } from '@/format';
import { minTouchTarget, spacing, useForeground } from '@/theme';

import { fieldsOf, readDraft, type Draft, type DraftProblem, type NumberField } from './entryDraft';

export type EntryFormProps = {
  initial: Draft;
  /** The exercises to choose from. */
  exercises: readonly Exercise[];
  onSubmit: (result: { exerciseId: string; date: string; note: string; measures: Measures }) => Promise<void>;
  /** Given when an existing entry is being edited. */
  onDelete?: () => Promise<void>;
};

/** Rows of the form: fields that belong together sit side by side. */
const ROWS: readonly (readonly NumberField[])[] = [
  ['reps', 'load'],
  ['distance'],
  ['segments', 'segmentLength'],
  ['minutes', 'seconds'],
  ['value'],
];

/** The form for a result: which exercise, which day, and the numbers that kind of exercise needs. */
export function EntryForm({ initial, exercises, onSubmit, onDelete }: EntryFormProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const foreground = useForeground();

  const [draft, setDraft] = useState(initial);
  const [problems, setProblems] = useState<DraftProblem[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const today = dayOf(new Date());
  const exercise = exercises.find((item) => item.id === draft.exerciseId) ?? exercises[0];
  if (!exercise) return null;

  const shown = fieldsOf(exercise);
  const set = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  const label = (field: NumberField): string => {
    switch (field) {
      case 'reps':
        return t('entry.reps');
      case 'load':
        return t(exercise.kind === 'weight' ? 'entry.barWeight' : 'entry.extraWeight');
      case 'minutes':
        return t('entry.minutes');
      case 'seconds':
        return t('entry.seconds');
      case 'distance':
        return t(exercise.distanceUnit === 'm' ? 'entry.distanceM' : 'entry.distanceKm');
      case 'segments':
        return t('entry.segments');
      case 'segmentLength':
        return t('entry.segmentLength');
      case 'value':
        return exercise.unit ? t('entry.valueIn', { unit: exercise.unit }) : t('entry.value');
    }
  };

  // A set against body weight needs only its reps; the load and the time are extras.
  const optional = (field: NumberField) => exercise.kind === 'bodyweight' && field !== 'reps';

  const describe = (problem: DraftProblem): string =>
    typeof problem === 'string'
      ? t(`entry.problems.${problem}`)
      : t('entry.problems.notANumber', { field: label(problem.notANumber) });

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
    } catch (error) {
      console.warn('Could not save the entry', error);
      setFailed(true);
      setBusy(false);
    }
  };

  const submit = () => {
    const { measures, problems: found } = readDraft(draft, exercise);
    setProblems(found);
    if (found.length > 0) return;

    void run(() => onSubmit({ exerciseId: exercise.id, date: draft.date, note: draft.note.trim(), measures }));
  };

  return (
    <>
      <Card>
        <AppText variant="label">{t('entry.exercise')}</AppText>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {exercises.map((item) => (
            <Chip
              key={item.id}
              label={format.exercise(item)}
              onPress={() => set({ exerciseId: item.id })}
              selected={item.id === exercise.id}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.day}>
          <Pressable
            accessibilityLabel={t('entry.previousDay')}
            accessibilityRole="button"
            onPress={() => set({ date: addDays(draft.date, -1) })}
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            <Ionicons color={foreground.accent} name="chevron-back" size={24} />
          </Pressable>
          <AppText align="center" strong style={styles.dayLabel}>
            {format.day(draft.date, today)}
          </AppText>
          <Pressable
            accessibilityLabel={t('entry.nextDay')}
            accessibilityRole="button"
            accessibilityState={{ disabled: draft.date >= today }}
            disabled={draft.date >= today}
            onPress={() => set({ date: addDays(draft.date, 1) })}
            style={({ pressed }) => [styles.step, pressed && styles.pressed, draft.date >= today && styles.disabled]}
          >
            <Ionicons color={foreground.accent} name="chevron-forward" size={24} />
          </Pressable>
        </View>

        {ROWS.map((row) => row.filter((field) => shown.includes(field)))
          .filter((row) => row.length > 0)
          .map((row) => (
            <View key={row.join()} style={styles.row}>
              {row.map((field) => (
                <TextField
                  key={field}
                  keyboardType="decimal-pad"
                  label={label(field)}
                  onChangeText={(text) => set({ [field]: text })}
                  remark={optional(field) ? t('entry.optional') : undefined}
                  value={draft[field]}
                />
              ))}
            </View>
          ))}

        {exercise.kind === 'text' ? (
          <TextField label={t('entry.words')} multiline onChangeText={(words) => set({ words })} value={draft.words} />
        ) : null}

        <TextField
          label={t('entry.note')}
          multiline
          onChangeText={(note) => set({ note })}
          remark={t('entry.optional')}
          value={draft.note}
        />
      </Card>

      {problems.length > 0 || failed ? (
        <Card accessibilityLiveRegion="polite" accessibilityRole="alert">
          {problems.map((problem) => (
            <AppText color="danger" key={JSON.stringify(problem)}>
              {describe(problem)}
            </AppText>
          ))}
          {failed ? <AppText color="danger">{t('entry.saveFailed')}</AppText> : null}
        </Card>
      ) : null}

      <Button disabled={busy} label={t('entry.save')} onPress={submit} />
      {onDelete ? <Button disabled={busy} label={t('entry.delete')} onPress={() => void run(onDelete)} variant="danger" /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    flex: 1,
  },
  step: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.3,
  },
});
