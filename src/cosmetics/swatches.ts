import type { Colour, Tent } from '@/domain';

/*
 * The colour of each choice as a plain swatch for the wardrobe. Sampled from the art, so a
 * swatch shows what the scene will show: the tents are saturated, the armours are pastel.
 */

export const ARMOUR_SWATCHES = {
  gray: '#686868',
  brown: '#825d39',
  green: '#92e874',
  blue: '#7584ea',
  lightBlue: '#75eae1',
  orange: '#e9c774',
  yellow: '#f2fa74',
  red: '#eb7b75',
  white: '#fafafa',
  black: '#2c252a',
  pink: '#eb8cf0',
  purple: '#b374e9',
} satisfies Record<Colour, string>;

export const TENT_SWATCHES = {
  canvas: '#a88d75',
  gray: '#8d8d8d',
  brown: '#8e6946',
  green: '#47ff44',
  blue: '#0020df',
  lightBlue: '#43d6fe',
  orange: '#feae35',
  yellow: '#fef144',
  red: '#c21016',
  white: '#ffffff',
  black: '#252525',
  pink: '#fe68e4',
  purple: '#a544fe',
} satisfies Record<Tent, string>;

/** Patterns are printed in the same paints as the tents. */
export const PATTERN_SWATCHES: Record<Colour, string> = TENT_SWATCHES;
