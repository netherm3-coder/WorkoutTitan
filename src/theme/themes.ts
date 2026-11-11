import { THEME_IDS, type Theme, type ThemeId } from './types';

/**
 * Camp is the WorkoutTitan look: dusk sky, wine and cream cards, hand-lettered type.
 * The gradient stops are sampled from Titan's original background image.
 */
const camp: Theme = {
  id: 'camp',
  isDark: true,
  backdrop: {
    gradient: ['#53496d', '#7d5f9c', '#a974b7', '#cf91c3', '#e6b9ce'],
    scrim: 'rgba(0, 0, 0, 0.34)',
    heading: '#fff7f2',
    text: '#f8ece7',
    muted: '#f4ddd6',
    accent: '#ffd6be',
    success: '#d3f5dc',
    danger: '#ffe0dc',
  },
  card: {
    background: 'rgba(40, 22, 26, 0.8)',
    border: 'rgba(255, 255, 255, 0.12)',
    heading: '#fff7f2',
    text: '#f8ece7',
    muted: '#d9c0b7',
    accent: '#f4b183',
    success: '#9fdcae',
    danger: '#ffa399',
  },
  cardAlt: {
    background: 'rgba(247, 234, 228, 0.94)',
    border: '#ceb1a8',
    heading: '#4f2c31',
    text: '#5c3238',
    muted: '#775a56',
    accent: '#723a45',
    success: '#2f6f4a',
    danger: '#a3312b',
  },
  button: {
    primary: { background: '#723a45', border: '#b98d84', text: '#f7e7e2' },
    accent: { background: '#f4b183', border: '#ffd6be', text: '#4c271d' },
  },
  tabBar: {
    background: '#28161a',
    border: 'rgba(255, 255, 255, 0.12)',
    active: '#f4b183',
    inactive: '#b59a92',
  },
  titleShadow: { color: '#524439', offsetX: 2, offsetY: 2, radius: 4 },
  fonts: {
    regular: 'ShantellSans_400Regular',
    medium: 'ShantellSans_600SemiBold',
    bold: 'ShantellSans_700Bold',
  },
};

/** Night is the dark theme of the Record web app: slate and indigo. */
const night: Theme = {
  id: 'night',
  isDark: true,
  backdrop: {
    gradient: ['#0f172a', '#121b33', '#1a1f45'],
    scrim: 'rgba(0, 0, 0, 0)',
    heading: '#f8fafc',
    text: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#818cf8',
    success: '#34d399',
    danger: '#fb7185',
  },
  card: {
    background: 'rgba(30, 41, 59, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    heading: '#f8fafc',
    text: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#818cf8',
    success: '#34d399',
    danger: '#fb7185',
  },
  cardAlt: {
    background: 'rgba(51, 65, 85, 0.7)',
    border: 'rgba(255, 255, 255, 0.1)',
    heading: '#f8fafc',
    text: '#e2e8f0',
    muted: '#a8b5c8',
    accent: '#a5b4fc',
    success: '#34d399',
    danger: '#fda4af',
  },
  button: {
    primary: { background: '#4f46e5', border: '#818cf8', text: '#ffffff' },
    accent: { background: '#f59e0b', border: '#fbbf24', text: '#2b1700' },
  },
  tabBar: {
    background: '#0f172a',
    border: 'rgba(255, 255, 255, 0.1)',
    active: '#818cf8',
    inactive: '#8391a7',
  },
  titleShadow: null,
  fonts: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_600SemiBold',
    bold: 'Nunito_800ExtraBold',
  },
};

/** Day is the light theme of the Record web app. */
const day: Theme = {
  id: 'day',
  isDark: false,
  backdrop: {
    gradient: ['#f1f5f9', '#eaeef8', '#e0e7ff'],
    scrim: 'rgba(0, 0, 0, 0)',
    heading: '#0f172a',
    text: '#1e293b',
    muted: '#55637a',
    accent: '#4f46e5',
    success: '#056a4a',
    danger: '#be123c',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.85)',
    border: 'rgba(15, 23, 42, 0.08)',
    heading: '#0f172a',
    text: '#1e293b',
    muted: '#55637a',
    accent: '#4f46e5',
    success: '#056a4a',
    danger: '#be123c',
  },
  cardAlt: {
    background: 'rgba(226, 232, 240, 0.8)',
    border: 'rgba(15, 23, 42, 0.08)',
    heading: '#0f172a',
    text: '#1e293b',
    muted: '#4d5b71',
    accent: '#4338ca',
    success: '#056a4a',
    danger: '#be123c',
  },
  button: {
    primary: { background: '#4f46e5', border: '#4338ca', text: '#ffffff' },
    accent: { background: '#f59e0b', border: '#d97706', text: '#2b1700' },
  },
  tabBar: {
    background: '#ffffff',
    border: 'rgba(15, 23, 42, 0.08)',
    active: '#4f46e5',
    inactive: '#64748b',
  },
  titleShadow: null,
  fonts: {
    regular: 'Nunito_400Regular',
    medium: 'Nunito_600SemiBold',
    bold: 'Nunito_800ExtraBold',
  },
};

const registry: Record<ThemeId, Theme> = { camp, night, day };

export const DEFAULT_THEME_ID: ThemeId = 'camp';

/** Themes in the order they are offered in settings. */
export const themes: readonly Theme[] = THEME_IDS.map((id) => registry[id]);

export function getTheme(id: ThemeId): Theme {
  return registry[id];
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}
