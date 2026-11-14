/**
 * The camp scene and its wardrobe: the pictures behind the ids of `src/domain/cosmetics`, the
 * scene that stacks them, and the hook that ties the chosen look to what is open.
 */

export { HAT_TILES } from './art';
export { CampScene, type CampSceneProps } from './CampScene';
export { itemName, rewardName } from './names';
export { Swatch, Tile, type SwatchProps, type TileProps } from './pickers';
export { sceneLayers, type SceneLayer } from './sceneLayers';
export { PREMIUM_SHOWCASE } from './showcase';
export { ARMOUR_SWATCHES, PATTERN_SWATCHES, TENT_SWATCHES } from './swatches';
export { useWardrobe, type Wardrobe } from './useWardrobe';
