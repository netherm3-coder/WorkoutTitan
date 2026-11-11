import type { FontName } from './fonts';

export const THEME_IDS = ['camp', 'night', 'day'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Colours for anything drawn on top of one kind of background. */
export type Foreground = {
  heading: string;
  text: string;
  muted: string;
  /** Links, selected marks and other interactive hints. */
  accent: string;
  success: string;
  danger: string;
};

/** A card fill together with the colours that are readable on it. */
export type Surface = Foreground & {
  background: string;
  border: string;
};

export type ButtonColors = {
  background: string;
  border: string;
  text: string;
};

/** Where a piece of UI sits. Text picks its colours from the tone around it. */
export type Tone = 'backdrop' | 'card' | 'cardAlt';

export type Theme = {
  id: ThemeId;
  /** Dark themes get light status bar icons. */
  isDark: boolean;
  /** The screen background: a top-to-bottom gradient dimmed by a scrim. */
  backdrop: Foreground & {
    gradient: readonly [string, string, ...string[]];
    scrim: string;
  };
  /** Main card. */
  card: Surface;
  /** Second card style, for contrast against the main one. */
  cardAlt: Surface;
  button: {
    primary: ButtonColors;
    accent: ButtonColors;
  };
  tabBar: {
    background: string;
    border: string;
    active: string;
    inactive: string;
  };
  /** Soft shadow under screen titles; `null` when the skin does not use one. */
  titleShadow: { color: string; offsetX: number; offsetY: number; radius: number } | null;
  fonts: {
    regular: FontName;
    medium: FontName;
    bold: FontName;
  };
};
