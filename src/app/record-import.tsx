import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { pickTextFile, readRecordCsv, type RecordCsv, type RecordImport } from '@/backup';
import { AppText, Button, Card, Screen } from '@/components';
import { newId, planRecordImport, useDatabase } from '@/db';
import { convertLegacyWorkouts, type Conversion, type ConversionIssue } from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

type Step =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'refused'; problem: 'notRecordCsv' | 'unreadable' }
  /** The file is read and waits for a yes. Nothing has changed yet. */
  | { step: 'ready'; name: string; file: RecordCsv; conversion: Conversion; plan: RecordImport }
  | { step: 'working' }
  | { step: 'done'; added: number }
  | { step: 'failed' };

const ISSUES: readonly ConversionIssue[] = ['keptAsText', 'looselyRead', 'distanceMissing', 'schemeAssumed', 'singleRepAssumed'];

/** Record's own wording, which is Ukrainian whatever the language here: what to look for there. */
const IN_RECORD = { button: 'Експорт рекордів', file: 'Рекорди_2026-11-13.csv', header: 'Дата,Вправа,Результат' };

/** How many of the entries that stayed text are quoted; the rest are only counted. */
const EXAMPLES = 5;

export default function RecordImportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const db = useDatabase();
  const { history, importRecord } = useRecords();

  const [state, setState] = useState<Step>({ step: 'idle' });

  // Opened from a link there is nothing to go back to, so return to the settings instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const choose = async () => {
    setState({ step: 'reading' });
    try {
      const picked = await pickTextFile();
      if (!picked) {
        setState({ step: 'idle' });
        return;
      }
      const file = readRecordCsv(picked.text);
      if (!file.ok) {
        setState({ step: 'refused', problem: file.problem });
        return;
      }
      const conversion = convertLegacyWorkouts(file.workouts, { newId: () => newId(Date.now()) });
      const plan = await planRecordImport(db, conversion, (name) => t('recordImport.fromRecord', { name }));
      setState({ step: 'ready', name: picked.name, file, conversion, plan });
    } catch (error) {
      console.warn("Could not read Record's file", error);
      setState({ step: 'refused', problem: 'unreadable' });
    }
  };

  const bringOver = async (plan: RecordImport) => {
    setState({ step: 'working' });
    try {
      await importRecord(plan);
      setState({ step: 'done', added: plan.entries.length });
    } catch (error) {
      console.warn("Could not bring Record's entries over", error);
      setState({ step: 'failed' });
    }
  };

  const number = (value: number) => format.number(value);

  const found = (ready: Extract<Step, { step: 'ready' }>) => {
    const { file, conversion, plan } = ready;
    const flagged = ISSUES.filter((issue) => plan.issues[issue] > 0);

    return (
      <View accessibilityLiveRegion="polite" style={styles.found}>
        <AppText strong>{t('recordImport.found', { name: ready.name })}</AppText>
        <AppText>{t('recordImport.rows', { total: number(file.workouts.length) })}</AppText>
        <AppText>{t('recordImport.newEntries', { total: number(plan.entries.length) })}</AppText>
        {plan.alreadyHere > 0 ? <AppText>{t('recordImport.alreadyHere', { total: number(plan.alreadyHere) })}</AppText> : null}

        {plan.exercises.length > 0 ? (
          <View>
            <AppText>{t('recordImport.newExercises', { total: number(plan.exercises.length) })}</AppText>
            {plan.exercises.map((exercise) => (
              <AppText key={exercise.id} color="muted" variant="label">
                {`${exercise.name}: ${format.kind(exercise)}`}
              </AppText>
            ))}
            <AppText color="muted" variant="label">
              {t('recordImport.exercisesHint', { screen: t('own.title') })}
            </AppText>
          </View>
        ) : null}

        {flagged.length > 0 ? (
          <View>
            <AppText strong>{t('recordImport.reservations')}</AppText>
            {flagged.map((issue) => (
              <AppText key={issue}>{t(`recordImport.issues.${issue}`, { total: number(plan.issues[issue]) })}</AppText>
            ))}
            {plan.keptAsText.slice(0, EXAMPLES).map((source, index) => (
              <AppText key={index} color="muted" variant="label">
                {t('recordImport.example', source)}
              </AppText>
            ))}
          </View>
        ) : null}

        {conversion.skipped.length > 0 ? (
          <AppText>{t('recordImport.skipped', { total: number(conversion.skipped.length) })}</AppText>
        ) : null}
        {file.unreadable.length > 0 ? (
          <AppText>
            {t('recordImport.brokenLines', {
              total: number(file.unreadable.length),
              lines: file.unreadable
                .slice(0, EXAMPLES)
                .map(({ line }) => line)
                .join(', '),
            })}
          </AppText>
        ) : null}

        {plan.entries.length > 0 ? (
          <Button label={t('recordImport.importButton')} onPress={() => bringOver(plan)} />
        ) : (
          <AppText color="muted">{t('recordImport.nothingNew')}</AppText>
        )}
        <Button label={t('recordImport.cancel')} onPress={() => setState({ step: 'idle' })} variant="danger" />
      </View>
    );
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('recordImport.title')}>
      <Card>
        <AppText variant="heading">{t('recordImport.howTitle')}</AppText>
        <AppText>{t('recordImport.how1', IN_RECORD)}</AppText>
        <AppText>{t('recordImport.how2')}</AppText>
        <AppText color="muted" variant="label">
          {t('recordImport.limits')}
        </AppText>
        <AppText color="muted" variant="label">
          {t('recordImport.again')}
        </AppText>
      </Card>

      <Card>
        {state.step === 'ready' ? (
          found(state)
        ) : (
          <Button
            disabled={state.step === 'reading' || state.step === 'working'}
            label={
              state.step === 'reading'
                ? t('recordImport.reading')
                : state.step === 'working'
                  ? t('recordImport.importing')
                  : t('recordImport.chooseButton')
            }
            onPress={choose}
          />
        )}

        {state.step === 'refused' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t(`recordImport.${state.problem}`, IN_RECORD)}
          </AppText>
        ) : null}
        {state.step === 'done' ? (
          <AppText accessibilityLiveRegion="polite" color="success">
            {t('recordImport.done', { added: number(state.added), total: number(history.entries.length) })}
          </AppText>
        ) : null}
        {state.step === 'failed' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t('recordImport.failed')}
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  found: {
    gap: spacing.sm,
  },
});
