import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { ShantellSans_400Regular } from '@expo-google-fonts/shantell-sans/400Regular';
import { ShantellSans_600SemiBold } from '@expo-google-fonts/shantell-sans/600SemiBold';
import { ShantellSans_700Bold } from '@expo-google-fonts/shantell-sans/700Bold';

/**
 * Every font face the app ships, keyed by the family name used in styles.
 *
 * Both families cover Ukrainian and English. Each weight is a separate file, so styles pick a
 * face by `fontFamily` and never set `fontWeight` (that would make Android fake the bold).
 */
export const fontAssets = {
  ShantellSans_400Regular,
  ShantellSans_600SemiBold,
  ShantellSans_700Bold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
} as const;

export type FontName = keyof typeof fontAssets;
