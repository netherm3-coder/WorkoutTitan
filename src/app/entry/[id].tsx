import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components';
import { useLanguage } from '@/i18n';
import { draftFrom, EntryForm, useRecords } from '@/records';

export default function EditEntryScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history, exercises, updateEntry, deleteEntry } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/workouts'));

  // Kept from the first look, so the form does not lose its entry while the screen closes
  // after a delete.
  const [entry] = useState(() => history.entries.find((item) => item.id === id));
  const exercise = entry ? history.exercises(entry.exerciseId) : undefined;

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('entry.editTitle')}>
      {entry && exercise ? (
        <EntryForm
          exercises={exercises}
          onManageExercises={() => router.push('/exercises')}
          initial={draftFrom(entry, exercise, language)}
          onDelete={async () => {
            await deleteEntry(entry.id);
            goBack();
          }}
          onSubmit={async ({ exerciseId, date, note, measures }) => {
            await updateEntry({ ...entry, ...measures, exerciseId, date, note });
            goBack();
          }}
        />
      ) : (
        <Card>
          <AppText>{t('entry.gone')}</AppText>
        </Card>
      )}
    </Screen>
  );
}
