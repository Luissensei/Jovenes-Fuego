import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'royal';

const THEME_STORAGE_KEY = 'jf-theme';

function readThemePreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'royal' ? saved : 'light';
  } catch {
    return 'light';
  }
}

function nextTheme(theme: ThemePreference): ThemePreference {
  return theme === 'light' ? 'dark' : 'light';
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const color = theme === 'light' ? '#f4f6f9' : '#101820';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // El tema sigue cambiando aunque el navegador bloquee localStorage.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => nextTheme(current));
  }, []);

  const nextThemeLabel = theme === 'light' ? 'modo oscuro' : 'modo claro';

  return {
    theme,
    isDark: theme !== 'light',
    isLight: theme === 'light',
    isRoyal: false,
    nextThemeLabel,
    toggleTheme,
  };
}
