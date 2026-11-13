import type { ImageSourcePropType } from 'react-native';

import type { Look } from '@/domain';

import { CAMPFIRE, HAT_ART, KNIGHT_ART, PATTERN_ART, SKY_ART, TENT_ART } from './art';

export type SceneLayer = { key: string; source: ImageSourcePropType };

/**
 * The pictures that make up the camp for a look, back to front. Every picture is drawn on the
 * same 4:3 canvas, so they stack without offsets. The order is WorkoutTitan's.
 */
export function sceneLayers(look: Look): SceneLayer[] {
  const layers: SceneLayer[] = [
    { key: 'sky', source: SKY_ART[look.sky][look.season] },
    { key: 'tent', source: TENT_ART[look.tent][look.season] },
  ];
  if (look.pattern) {
    layers.push({ key: 'pattern', source: PATTERN_ART[look.pattern][look.patternColour] });
  }
  layers.push({ key: 'knight', source: KNIGHT_ART[look.armour] });
  if (look.hat) {
    layers.push({ key: 'hat', source: HAT_ART[look.hat] });
  }
  layers.push({ key: 'campfire', source: CAMPFIRE });

  return layers;
}
