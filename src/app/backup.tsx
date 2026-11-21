import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  backupFileName,
  buildBackup,
  entriesTableName,
  pickTextFile,
  readBackup,
  serialiseBackup,
  shareTextFile,
  toCsv,
  withHours,
  type Backup,
  type BackupProblem,
  type Cell,
} from '@/backup';
import { AppText, Button, Card, Screen } from '@/components';
import { collectBackupData, planRestore, useDatabase, type RestorePlan } from '@/db';
import { dayOf, type Exercise, type WorkoutEntry } from '@/domain';
import { useFormat } from '@/format';
import { useRecords } from '@/records';
import { spacing } from '@/theme';

type Saving = { step: 'idle' } | { step: 'working' } | { step: 'done'; name: string } | { step: 'failed' };

type Restoring =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'refused'; problem: BackupProblem | 'unreadable'; where?: string }
  /** The file is read and waits for a yes. Nothing has changed yet. */
  | { step: 'ready'; name: string; backup: Backup; plan: RestorePlan }
  | { step: 'working' }
  | { step: 'done' }
  | { step: 'failed' };

export default function BackupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const db = useDatabase();
  const { history, restoreBackup } = useRecords();

  const [saving, setSaving] = useState<Saving>({ step: 'idle' });
  const [restoring, setRestoring] = useState<Restoring>({ step: 'idle' });
  const [table, setTable] = useState<Saving>({ step: 'idle' });

  // Opened from a link there is nothing to go back to, so return to the settings instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const save = async () => {
    setSaving({ step: 'working' });
    try {
      const now = new Date();
      const name = backupFileName(dayOf(now));
      const backup = buildBackup(await collectBackupData(db), now, Constants.expoConfig?.version ?? null);
      await shareTextFile(name, serialiseBackup(backup), 'application/json');
      setSaving({ step: 'done', name });
    } catch (error) {
      console.warn('Could not save the backup', error);
      setSaving({ step: 'failed' });
    }
  };

  /** One entry as a row of the table: the result as the journal writes it, then its numbers. */
  const rowOf = (entry: WorkoutEntry, exercise: Exercise): Cell[] => {
    const number = (value: number | null) => (value === null ? null : format.number(value));
    return [
      entry.date,
      format.discipline(exercise, entry),
      withHours(format.result(entry, exercise)),
      number(entry.reps),
      entry.loadKg === null ? null : format.weightField(entry.loadKg),
      number(entry.durationMs === null ? null : entry.durationMs / 1000),
      // A shuttle run stores one leg; the table gives the whole distance, as for a run.
      number(entry.distanceM === null ? null : entry.distanceM * (entry.segments ?? 1)),
      number(entry.value),
      entry.note,
      entry.videoUrl,
      entry.resultUrl,
    ];
  };

  const saveTable = async () => {
    setTable({ step: 'working' });
    try {
      const name = entriesTableName(dayOf(new Date()));
      const columns = (key: 'date' | 'discipline' | 'result' | 'reps' | 'time' | 'distance' | 'value' | 'note' | 'video' | 'resultUrl') =>
        t(`backup.tableColumns.${key}`);
      const header: Cell[] = [
        columns('date'),
        columns('discipline'),
        columns('result'),
        columns('reps'),
        t('backup.tableColumns.load', { unit: format.weightUnit }),
        columns('time'),
        columns('distance'),
        columns('value'),
        columns('note'),
        columns('video'),
        columns('resultUrl'),
      ];
      // Oldest first, as the history keeps them: the order a chart in a spreadsheet wants.
      const rows = history.entries.flatMap((entry) => {
        const exercise = history.exercises(entry.exerciseId);
        return exercise ? [rowOf(entry, exercise)] : [];
      });
      await shareTextFile(name, toCsv([header, ...rows]), 'text/csv');
      setTable({ step: 'done', name });
    } catch (error) {
      console.warn('Could not save the table', error);
      setTable({ step: 'failed' });
    }
  };

  const choose = async () => {
    setRestoring({ step: 'reading' });
    try {
      const file = await pickTextFile();
      if (!file) {
        setRestoring({ step: 'idle' });
        return;
      }
      const reading = readBackup(file.text);
      if (!reading.ok) {
        setRestoring({ step: 'refused', problem: reading.problem, where: reading.problem === 'damaged' ? reading.where : undefined });
        return;
      }
      setRestoring({ step: 'ready', name: file.name, backup: reading.backup, plan: await planRestore(db, reading.backup) });
    } catch (error) {
      console.warn('Could not read the backup', error);
      setRestoring({ step: 'refused', problem: 'unreadable' });
    }
  };

  const restore = async (backup: Backup) => {
    setRestoring({ step: 'working' });
    try {
      await restoreBackup(backup);
      setRestoring({ step: 'done' });
    } catch (error) {
      console.warn('Could not restore the backup', error);
      setRestoring({ step: 'failed' });
    }
  };

  const count = (key: 'entries' | 'newEntries' | 'exercises' | 'weights' | 'measurements' | 'goals', total: number) => (
    <AppText>{t(`backup.${key}`, { total: format.number(total) })}</AppText>
  );

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('backup.title')}>
      <Card>
        <AppText variant="heading">{t('backup.saveTitle')}</AppText>
        <AppText>{t('backup.saveBody')}</AppText>
        <AppText color="muted" variant="label">
          {t('settings.entriesOnPhone', { total: history.entries.length })}
        </AppText>
        <Button
          disabled={saving.step === 'working'}
          label={saving.step === 'working' ? t('backup.saving') : t('backup.saveButton')}
          onPress={save}
        />
        {saving.step === 'done' ? (
          <AppText accessibilityLiveRegion="polite" color="success">
            {t('backup.saved', { name: saving.name })}
          </AppText>
        ) : null}
        {saving.step === 'failed' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t('backup.saveFailed')}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">{t('backup.tableTitle')}</AppText>
        <AppText>{t('backup.tableBody')}</AppText>
        {history.entries.length === 0 ? (
          <AppText color="muted" variant="label">
            {t('backup.tableNothing')}
          </AppText>
        ) : (
          <Button
            disabled={table.step === 'working'}
            label={table.step === 'working' ? t('backup.tableSaving') : t('backup.tableButton')}
            onPress={saveTable}
            variant="accent"
          />
        )}
        {table.step === 'done' ? (
          <AppText accessibilityLiveRegion="polite" color="success">
            {t('backup.tableSaved', { name: table.name })}
          </AppText>
        ) : null}
        {table.step === 'failed' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t('backup.tableFailed')}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading">{t('backup.restoreTitle')}</AppText>
        <AppText>{t('backup.restoreBody')}</AppText>

        {restoring.step === 'ready' ? (
          <View accessibilityLiveRegion="polite" style={styles.found}>
            <AppText strong>{t('backup.found', { name: restoring.name })}</AppText>
            <AppText>
              {t('backup.made', { day: format.day(dayOf(new Date(restoring.backup.exportedAt)), dayOf(new Date())) })}
            </AppText>
            {count('entries', restoring.backup.entries.length)}
            {count('newEntries', restoring.plan.newEntries)}
            {count('exercises', restoring.backup.exercises.length)}
            {count('weights', restoring.backup.bodyWeights.length)}
            {count('measurements', restoring.backup.bodyMeasurements.length)}
            {count('goals', restoring.backup.goals.length)}
            <Button label={t('backup.restoreButton')} onPress={() => restore(restoring.backup)} />
            <Button label={t('backup.cancel')} onPress={() => setRestoring({ step: 'idle' })} variant="danger" />
          </View>
        ) : (
          <Button
            disabled={restoring.step === 'reading' || restoring.step === 'working'}
            label={
              restoring.step === 'reading'
                ? t('backup.reading')
                : restoring.step === 'working'
                  ? t('backup.restoring')
                  : t('backup.chooseButton')
            }
            onPress={choose}
          />
        )}

        {restoring.step === 'refused' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t(`backup.problems.${restoring.problem}`, { where: restoring.where })}
          </AppText>
        ) : null}
        {restoring.step === 'done' ? (
          <AppText accessibilityLiveRegion="polite" color="success">
            {t('backup.restored', { total: format.number(history.entries.length) })}
          </AppText>
        ) : null}
        {restoring.step === 'failed' ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {t('backup.restoreFailed')}
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
