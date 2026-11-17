import { launchImageLibraryAsync } from 'expo-image-picker';

/** How many pictures can be chosen at once: front, side and back of one day, with room to spare. */
export const MAX_PICKED = 10;

/**
 * Lets the person choose pictures through the system's photo picker. The app sees only the
 * chosen ones and needs no permission to the gallery. Nothing chosen gives an empty list.
 */
export async function pickPhotos(): Promise<string[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_PICKED,
    // Re-encoded at 80 %: a phone camera's 5 MB picture becomes about 1 MB that looks the same.
    quality: 0.8,
    exif: false,
  });
  return result.canceled ? [] : result.assets.map((asset) => asset.uri);
}
