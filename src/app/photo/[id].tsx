import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components';
import { dayOf } from '@/domain';
import { useFormat } from '@/format';
import { fromRouteParam } from '@/navigation';
import { photoUri, usePhotos } from '@/photos';
import { radii, spacing } from '@/theme';

/** One progress photo, as large as the screen allows, with a way to delete it. */
export default function PhotoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const id = fromRouteParam(useLocalSearchParams<{ id: string }>().id);
  const { photos, remove } = usePhotos();

  // Kept from the first look, so that the screen does not lose its photo while it closes after a delete.
  const [photo] = useState(() => photos.find((item) => item.id === id));
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/photos'));
  const day = photo ? format.day(photo.date, dayOf(new Date())) : '';

  const deleteIt = async () => {
    if (!photo) return;
    setFailed(false);
    try {
      await remove(photo.id);
      goBack();
    } catch (error) {
      console.warn('Could not delete the photo', error);
      setFailed(true);
    }
  };

  return (
    <Screen backLabel={t('common.back')} onBack={goBack} title={photo ? day : t('photos.title')}>
      {photo ? (
        <>
          <Image
            accessibilityLabel={t('photos.photoOf', { day })}
            resizeMode="contain"
            source={{ uri: photoUri(photo.file) }}
            style={styles.image}
          />
          <Card>
            {confirming ? (
              <View style={styles.confirm}>
                <AppText>{t('photos.confirmDelete')}</AppText>
                <Button label={t('photos.confirm')} onPress={() => void deleteIt()} variant="danger" />
                <Button label={t('photos.keep')} onPress={() => setConfirming(false)} variant="accent" />
              </View>
            ) : (
              <Button label={t('photos.delete')} onPress={() => setConfirming(true)} variant="danger" />
            )}
            {failed ? (
              <AppText accessibilityRole="alert" color="danger">
                {t('photos.deleteFailed')}
              </AppText>
            ) : null}
          </Card>
        </>
      ) : (
        <Card>
          <AppText>{t('photos.gone')}</AppText>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
  },
  confirm: {
    gap: spacing.md,
  },
});
