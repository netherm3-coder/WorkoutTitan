import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components';
import { dayOf } from '@/domain';
import { useFormat } from '@/format';
import { toRouteParam } from '@/navigation';
import { spacing } from '@/theme';

import { PhotoThumb } from './PhotoThumb';
import { usePhotos } from './PhotosProvider';

/** How many of the latest photos the body screen shows. */
const LATEST = 3;

/** The latest progress photos on the body screen, and the way to the diary. */
export function PhotosCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const { photos } = usePhotos();
  const [width, setWidth] = useState(0);

  const today = dayOf(new Date());
  const size = width > 0 ? Math.floor((width - spacing.sm * (LATEST - 1)) / LATEST) : 0;

  return (
    <Card>
      <AppText variant="heading">{t('photos.title')}</AppText>
      {photos.length === 0 ? <AppText color="muted">{t('photos.none')}</AppText> : null}
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.row} testID="photo-grid">
        {size > 0
          ? photos.slice(0, LATEST).map((photo) => (
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
      <Button label={photos.length === 0 ? t('photos.addFirst') : t('photos.all', { total: photos.length })} onPress={() => router.push('/photos')} variant="accent" />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
