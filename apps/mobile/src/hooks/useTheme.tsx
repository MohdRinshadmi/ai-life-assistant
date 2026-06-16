import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Theme, darkTheme, lightTheme } from '@theme';

/**
 * Theme Context
 *
 * Provides theme data and toggle functionality throughout the app.
 * Defaults to system preference, allows manual override.
 */

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Dark-first: every screen paints the dark Syncra backdrop, so following a
  // light system scheme renders dark-on-dark text. Users opt into light mode
  // via the Settings toggle instead.
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setIsDark(dark);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      toggleTheme,
      setDarkMode,
    }),
    [isDark, toggleTheme, setDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
