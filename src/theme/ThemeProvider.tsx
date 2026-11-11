import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_THEME_ID, getTheme } from './themes';
import type { Foreground, Theme, ThemeId, Tone } from './types';

type ThemeContextValue = {
  theme: Theme;
  /** Switches the skin at once, for the whole app. */
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const ToneContext = createContext<Tone>('backdrop');

type ThemeProviderProps = {
  /** The saved choice, if there is one. */
  initialThemeId?: ThemeId | null;
  /** Called with every new choice so it can be saved. */
  onThemeChange?: (id: ThemeId) => void;
  children: ReactNode;
};

export function ThemeProvider({ initialThemeId, onThemeChange, children }: ThemeProviderProps) {
  const [themeId, setCurrentThemeId] = useState<ThemeId>(initialThemeId ?? DEFAULT_THEME_ID);

  const setThemeId = useCallback(
    (id: ThemeId) => {
      setCurrentThemeId(id);
      onThemeChange?.(id);
    },
    [onThemeChange],
  );

  const value = useMemo(() => ({ theme: getTheme(themeId), setThemeId }), [themeId, setThemeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return value;
}

/** Marks everything inside as sitting on the given kind of background. */
export function ToneProvider({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>;
}

export function useTone(): Tone {
  return useContext(ToneContext);
}

/** The text and icon colours that are readable where the calling component sits. */
export function useForeground(): Foreground {
  const { theme } = useTheme();
  return theme[useTone()];
}
