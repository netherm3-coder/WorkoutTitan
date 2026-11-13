import { Image, StyleSheet, View } from 'react-native';

import type { Look } from '@/domain';
import { radii } from '@/theme';

import { sceneLayers } from './sceneLayers';

export type CampSceneProps = {
  /** What to draw. Pass the look that may be worn (`useWardrobe().shown`), not the raw choice. */
  look: Look;
  /** What a screen reader says for the picture. */
  label: string;
};

/** WorkoutTitan's campsite: the knight by the fire, dressed in the given look. */
export function CampScene({ look, label }: CampSceneProps) {
  return (
    <View accessibilityLabel={label} accessibilityRole="image" accessible style={styles.scene}>
      {sceneLayers(look).map((layer) => (
        <Image key={layer.key} resizeMode="cover" source={layer.source} style={styles.layer} testID={`scene-${layer.key}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
