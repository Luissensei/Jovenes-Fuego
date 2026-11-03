import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark';

const THEME_STORAGE_KEY = 'jf-theme';

function readThemePreference(): ThemePreference {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light'
      ? 'light'
      : 'dark';
  } catch {
    return 'dark';
  }
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // El tema sigue cambiando aunque el navegador bloquee localStorage.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  };
}
