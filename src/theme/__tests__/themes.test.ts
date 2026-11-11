import { composite, contrastRatio, parseColor, type Rgba } from '../color';
import { fontAssets } from '../fonts';
import { DEFAULT_THEME_ID, getTheme, isThemeId, themes } from '../themes';
import { THEME_IDS, type Foreground, type Theme } from '../types';

/** WCAG AA for body text, and the relaxed bar for large text such as screen titles. */
const AA = 4.5;
const AA_LARGE = 3;

const FOREGROUND_KEYS = ['heading', 'text', 'muted', 'accent', 'success', 'danger'] as const;

/** Every colour the backdrop can show: each gradient stop under the scrim. */
function backdropColours(theme: Theme): Rgba[] {
  const scrim = parseColor(theme.backdrop.scrim);
  return theme.backdrop.gradient.map((stop) => composite(scrim, parseColor(stop)));
}

/** Every colour a card can end up as, since cards are translucent over the backdrop. */
function surfaceColours(theme: Theme, surface: 'card' | 'cardAlt'): Rgba[] {
  const fill = parseColor(theme[surface].background);
  return backdropColours(theme).map((under) => composite(fill, under));
}

function worstContrast(colour: string, backgrounds: Rgba[]): number {
  const foreground = parseColor(colour);
  return Math.min(...backgrounds.map((background) => contrastRatio(foreground, background)));
}

function collectColours(theme: Theme): string[] {
  const foreground = (set: Foreground) => FOREGROUND_KEYS.map((key) => set[key]);
  return [
    ...theme.backdrop.gradient,
    theme.backdrop.scrim,
    ...foreground(theme.backdrop),
    theme.card.background,
    theme.card.border,
    ...foreground(theme.card),
    theme.cardAlt.background,
    theme.cardAlt.border,
    ...foreground(theme.cardAlt),
    ...Object.values(theme.button.primary),
    ...Object.values(theme.button.accent),
    ...Object.values(theme.tabBar),
    ...(theme.titleShadow ? [theme.titleShadow.color] : []),
  ];
}

describe('theme registry', () => {
  it('offers every theme id exactly once, in the declared order', () => {
    expect(themes.map((theme) => theme.id)).toEqual([...THEME_IDS]);
  });

  it('returns the theme that was asked for', () => {
    for (const id of THEME_IDS) {
      expect(getTheme(id).id).toBe(id);
    }
  });

  it('defaults to a theme that exists', () => {
    expect(isThemeId(DEFAULT_THEME_ID)).toBe(true);
  });

  it('recognises only known ids', () => {
    expect(isThemeId('camp')).toBe(true);
    expect(isThemeId('Camp')).toBe(false);
    expect(isThemeId('')).toBe(false);
    expect(isThemeId(null)).toBe(false);
    expect(isThemeId(1)).toBe(false);
  });
});

describe.each(themes.map((theme) => [theme.id, theme] as const))('%s theme', (_id, theme) => {
  it('uses only colours the app can parse', () => {
    for (const colour of collectColours(theme)) {
      expect(() => parseColor(colour)).not.toThrow();
    }
  });

  it('uses only fonts that are bundled', () => {
    for (const font of Object.values(theme.fonts)) {
      expect(Object.keys(fontAssets)).toContain(font);
    }
  });

  it('paints an opaque backdrop', () => {
    for (const stop of theme.backdrop.gradient) {
      expect(parseColor(stop).a).toBe(1);
    }
  });

  it.each(['card', 'cardAlt'] as const)('keeps every text colour readable on %s', (surface) => {
    const backgrounds = surfaceColours(theme, surface);
    for (const key of FOREGROUND_KEYS) {
      expect({ key, contrast: worstContrast(theme[surface][key], backgrounds) >= AA }).toEqual({
        key,
        contrast: true,
      });
    }
  });

  it('keeps titles readable where they sit, at the top of the backdrop', () => {
    const top = backdropColours(theme).slice(0, 1);
    for (const key of FOREGROUND_KEYS) {
      expect({ key, contrast: worstContrast(theme.backdrop[key], top) >= AA }).toEqual({
        key,
        contrast: true,
      });
    }
  });

  it('keeps large text readable anywhere on the backdrop', () => {
    const anywhere = backdropColours(theme);
    for (const key of ['heading', 'text'] as const) {
      expect({ key, contrast: worstContrast(theme.backdrop[key], anywhere) >= AA_LARGE }).toEqual({
        key,
        contrast: true,
      });
    }
  });

  it.each(['primary', 'accent'] as const)('keeps the %s button label readable', (variant) => {
    const { background, text } = theme.button[variant];
    expect(contrastRatio(parseColor(text), parseColor(background))).toBeGreaterThanOrEqual(AA);
  });

  it('keeps tab labels readable', () => {
    const bar = [parseColor(theme.tabBar.background)];
    expect(parseColor(theme.tabBar.background).a).toBe(1);
    expect(worstContrast(theme.tabBar.active, bar)).toBeGreaterThanOrEqual(AA);
    expect(worstContrast(theme.tabBar.inactive, bar)).toBeGreaterThanOrEqual(AA);
  });

  it('tells active and inactive tabs apart', () => {
    expect(theme.tabBar.active).not.toBe(theme.tabBar.inactive);
  });
});
