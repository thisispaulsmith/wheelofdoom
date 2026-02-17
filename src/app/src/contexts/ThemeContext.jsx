import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [wheelPalette, setWheelPaletteState] = useState(() => {
    return localStorage.getItem('wheelPalette') || 'classic';
  });

  useEffect(() => {
    // Apply theme to root element
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('wheelPalette', wheelPalette);
  }, [wheelPalette]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const setWheelPalette = (newPalette) => {
    setWheelPaletteState(newPalette);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, wheelPalette, setWheelPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}
