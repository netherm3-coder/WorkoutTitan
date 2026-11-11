import { Image, StyleSheet, View } from 'react-native';

import { radii } from '@/theme';

/** Back to front. Every layer is drawn on the same 4:3 canvas, so they stack without offsets. */
const LAYERS = [
  { key: 'groundAndSky', source: require('@/assets/AppAssets/Campsite/CleaningIdle/GroundAndSky/S.N.png') },
  { key: 'tentAndLeaves', source: require('@/assets/AppAssets/Campsite/CleaningIdle/TentAndLeaves/Non.Non.png') },
  { key: 'knight', source: require('@/assets/AppAssets/Campsite/CleaningIdle/Knight/Gray.gif') },
  { key: 'campfire', source: require('@/assets/AppAssets/Campsite/Campfire.gif') },
] as const;

/**
 * WorkoutTitan's campsite: the knight by the fire, in its default look.
 * Choosing outfits, tents and skies arrives with the cosmetics stage.
 */
export function CampScene({ label }: { label: string }) {
  return (
    <View accessibilityLabel={label} accessibilityRole="image" accessible style={styles.scene}>
      {LAYERS.map((layer) => (
        <Image key={layer.key} resizeMode="cover" source={layer.source} style={styles.layer} />
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
