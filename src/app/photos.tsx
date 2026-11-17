import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, DayStepper, EmptyState, Screen } from '@/components';
import { dayOf, photoDays } from '@/domain';
import { useFormat } from '@/format';
import { toRouteParam } from '@/navigation';
import { MAX_PICKED, PhotoThumb, usePhotos } from '@/photos';
import { spacing } from '@/theme';

/** How many photos the diary shows at first, and how many more each time it is asked. */
const PAGE = 30;
const COLUMNS = 3;

/**
 * Record's photo diary: add pictures for a day from the phone's gallery, and look back at them
 * by day, newest first.
 */
export default function PhotosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { photos, addFromGallery } = usePhotos();

  const today = dayOf(new Date());
  const [day, setDay] = useState(today);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [width, setWidth] = useState(0);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/body'));
  const size = width > 0 ? Math.floor((width - spacing.sm * (COLUMNS - 1)) / COLUMNS) : 0;

  const add = async () => {
    setBusy(true);
    setProblem(null);
    try {
      await addFromGallery(day);
    } catch (error) {
      console.warn('Could not add the photos', error);
      setProblem(t('photos.addFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} subtitle={t('photos.subtitle')} title={t('photos.title')}>
      <Card>
        <DayStepper day={day} onChange={setDay} today={today} />
        <Button disabled={busy} label={t('photos.add')} onPress={() => void add()} />
        <AppText color="muted" variant="label">
          {t('photos.addHint', { max: MAX_PICKED })}
        </AppText>
        {problem ? (
          <AppText accessibilityLiveRegion="polite" accessibilityRole="alert" color="danger">
            {problem}
          </AppText>
        ) : null}
      </Card>

      {photos.length === 0 ? (
        <Card>
          <EmptyState body={t('photos.emptyBody')} icon="images-outline" title={t('photos.emptyTitle')} />
        </Card>
      ) : null}

      {photoDays(photos.slice(0, limit)).map((group) => (
        <Card key={group.date}>
          <AppText color="muted" variant="label">
            {format.day(group.date, today)}
          </AppText>
          <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.grid} testID="photo-grid">
            {size > 0
              ? group.photos.map((photo) => (
                  <PhotoThumb
                    key={photo.id}
                    label={t('photos.photoOf', { day: format.day(photo.date, today) })}
                    onPress={() => router.push({ pathname: '/photo/[id]', params: { id: toRouteParam(photo.id) } })}
                    photo={photo}
                    size={size}
                  />
                ))
              : null}
          </View>
        </Card>
      ))}

      {photos.length > limit ? (
        <Button label={t('photos.showMore')} onPress={() => setLimit((shown) => shown + PAGE)} variant="accent" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
