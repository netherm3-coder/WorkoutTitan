import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { minTouchTarget, radii, useForeground } from '@/theme';
import { parseColor, relativeLuminance } from '@/theme/color';

type ChoiceProps = {
  /** What a screen reader says: the name, and that it is locked when it is. */
  accessibilityLabel: string;
  selected: boolean;
  /** Not open yet. It can still be pressed, to ask what opens it. */
  locked: boolean;
  onPress: () => void;
};

const DARK_MARK = '#1b1036';
const LIGHT_MARK = '#ffffff';

/** A mark that stays readable on any swatch: dark on light paints, light on dark ones. */
const markOn = (color: string) => (relativeLuminance(parseColor(color)) > 0.4 ? DARK_MARK : LIGHT_MARK);

export type SwatchProps = ChoiceProps & { color: string };

/** One colour to choose. The chosen one carries a tick, so it does not rely on the ring alone. */
export function Swatch({ color, accessibilityLabel, selected, locked, onPress }: SwatchProps) {
  const foreground = useForeground();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.swatch,
        { borderColor: selected ? foreground.heading : foreground.muted, borderWidth: selected ? 3 : 1 },
        pressed && styles.pressed,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }, locked && styles.dimmed]} />
      {locked ? <Ionicons color={foreground.text} name="lock-closed" size={18} /> : null}
      {selected && !locked ? <Ionicons color={markOn(color)} name="checkmark" size={24} /> : null}
    </Pressable>
  );
}

export type TileProps = ChoiceProps & {
  /** The picture of the item; without one the tile stands for "nothing". */
  source?: ImageSourcePropType;
};

/** One item to choose by its picture. */
export function Tile({ source, accessibilityLabel, selected, locked, onPress }: TileProps) {
  const foreground = useForeground();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { borderColor: selected ? foreground.heading : foreground.muted, borderWidth: selected ? 3 : 1 },
        pressed && styles.pressed,
      ]}
    >
      {source ? (
        <Image resizeMode="cover" source={source} style={[styles.picture, locked && styles.faded]} />
      ) : (
        <Ionicons color={foreground.muted} name="close" size={28} />
      )}
      {locked ? (
        <View style={styles.badge}>
          <Ionicons color={LIGHT_MARK} name="lock-closed" size={14} />
        </View>
      ) : null}
      {selected && source && !locked ? (
        <View style={styles.badge}>
          <Ionicons color={LIGHT_MARK} name="checkmark" size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

const TILE = 64;

const styles = StyleSheet.create({
  swatch: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picture: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  dimmed: {
    opacity: 0.3,
  },
  // A locked picture stays recognisable: it is what the person is working towards.
  faded: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
