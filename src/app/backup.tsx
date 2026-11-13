import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  backupFileName,
  buildBackup,
  pickTextFile,
  readBackup,
  serialiseBackup,
  shareTextFile,
  type Backup,
  type BackupProblem,
} from '@/backup';
import { AppText, Button, Card, Screen } from '@/components';
import { collectBackupData, planRestore, useDatabase, type RestorePlan } from '@/db';
import { dayOf } from '@/domain';
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
