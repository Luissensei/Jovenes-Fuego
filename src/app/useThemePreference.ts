import { useEffect } from 'react';

/** La aplicación utiliza un único tema visual: Command Center oscuro. */
export type ThemePreference = 'dark';

export function useThemePreference() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#071326');
    try {
      window.localStorage.removeItem('jf-theme');
    } catch {
      // El diseño único no depende del almacenamiento local.
    }
  }, []);

  return {
    theme: 'dark' as const,
    isDark: true,
    isLight: false,
    isRoyal: false,
    nextThemeLabel: '',
    toggleTheme: () => undefined,
  };
}
