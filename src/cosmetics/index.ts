/**
 * The camp scene and its wardrobe: the pictures behind the ids of `src/domain/cosmetics`, the
 * scene that stacks them, the hook that ties the chosen look to what is open, and the news of
 * items the person has earned but not looked at yet.
 */

export { HAT_TILES } from './art';
export { CampScene, type CampSceneProps } from './CampScene';
export { itemName, rewardName } from './names';
export { NewItemsNotice } from './NewItemsNotice';
export { NewItemsProvider, useNewItems, type NewItems, type NewItemsProviderProps } from './NewItemsProvider';
export { Swatch, Tile, type SwatchProps, type TileProps } from './pickers';
export { sceneLayers, type SceneLayer } from './sceneLayers';
export { itemKey, loadSeenItems } from './seenItems';
export { PREMIUM_SHOWCASE } from './showcase';
export { ARMOUR_SWATCHES, PATTERN_SWATCHES, TENT_SWATCHES } from './swatches';
export { useWardrobe, type Wardrobe } from './useWardrobe';
