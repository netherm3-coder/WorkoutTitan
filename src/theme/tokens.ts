/** Layout and type values shared by every skin. Colours and fonts live in `themes.ts`. */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

/** Font size and line height per text role. */
export const typeScale = {
  display: { fontSize: 30, lineHeight: 38 },
  title: { fontSize: 22, lineHeight: 28 },
  heading: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export type TextVariant = keyof typeof typeScale;

/** Smallest comfortable touch target. */
export const minTouchTarget = 48;
