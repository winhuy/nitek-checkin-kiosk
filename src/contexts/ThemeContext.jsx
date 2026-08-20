import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
const THEME_KEY = 'nitek_theme';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return false;
    }
    return true; // Default to dark mode
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const theme = isDark ? 'dark' : 'light';
    
    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
