import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components';
import { dayOf, PULLUPS } from '@/domain';
import { emptyDraft, EntryForm, useRecords } from '@/records';

export default function NewEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { history, exercises, addEntry } = useRecords();

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/workouts'));

  // Start from the exercise logged last: most of the time it is the one being logged again.
  const last = history.entries[history.entries.length - 1];

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={t('entry.newTitle')}>
      <EntryForm
        exercises={exercises}
        onManageExercises={() => router.push('/exercises')}
        initial={emptyDraft(last?.exerciseId ?? PULLUPS.id, dayOf(new Date()))}
        onSubmit={async ({ exerciseId, date, note, measures }) => {
          await addEntry({ ...measures, exerciseId, date, note });
          goBack();
        }}
      />
    </Screen>
  );
}
