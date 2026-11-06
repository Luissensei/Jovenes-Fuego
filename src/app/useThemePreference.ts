import {useCallback, useEffect, useState} from 'react';

export type ThemePreference = 'dark' | 'light';

function readThemePreference(): ThemePreference {
  try {
    return window.localStorage.getItem('jf-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

/** Tema persistente y compartido por el panel administrativo y el portal juvenil. */
export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#07182b' : '#f3f7fc',
    );
    try {
      window.localStorage.setItem('jf-theme', theme);
    } catch {
      // La aplicación sigue funcionando aunque el navegador bloquee el almacenamiento.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isRoyal: false,
    nextThemeLabel: theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    toggleTheme,
  };
}
