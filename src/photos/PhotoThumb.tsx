import { Image, Pressable, StyleSheet } from 'react-native';

import type { ProgressPhoto } from '@/domain';
import { radii, useForeground } from '@/theme';

import { photoUri } from './files';

export type PhotoThumbProps = {
  photo: ProgressPhoto;
  size: number;
  /** What a screen reader says: the photo and its day. */
  label: string;
  onPress: () => void;
};

/** A square preview of a progress photo that opens it. */
export function PhotoThumb({ photo, size, label, onPress }: PhotoThumbProps) {
  const foreground = useForeground();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="imagebutton"
      onPress={onPress}
      style={({ pressed }) => [styles.frame, { width: size, height: size, borderColor: foreground.muted }, pressed && styles.pressed]}
    >
      <Image resizeMode="cover" source={{ uri: photoUri(photo.file) }} style={styles.image} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
});
