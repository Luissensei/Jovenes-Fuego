import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'royal';

const THEME_STORAGE_KEY = 'jf-theme';

function readThemePreference(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'royal' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}

function nextTheme(theme: ThemePreference): ThemePreference {
  if (theme === 'dark') return 'light';
  if (theme === 'light') return 'royal';
  return 'dark';
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const color = theme === 'royal' ? '#120e20' : theme === 'light' ? '#f3f5fa' : '#0b1020';
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

  const nextThemeLabel = theme === 'dark' ? 'modo claro' : theme === 'light' ? 'tema Imperial' : 'modo oscuro';

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isRoyal: theme === 'royal',
    nextThemeLabel,
    toggleTheme,
  };
}
