import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import THEMES from '../utils/themes';

const THEME_KEY = 'crushedit_theme';
const HAS_CHOSEN_THEME_KEY = 'crushedit_has_chosen_theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState('midnight');
  const [hasChosenTheme, setHasChosenTheme] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, hasChosen] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(HAS_CHOSEN_THEME_KEY),
        ]);
        if (savedTheme && THEMES[savedTheme]) setThemeId(savedTheme);
        setHasChosenTheme(hasChosen === 'true');
      } catch (e) {
        console.error('Failed to load theme:', e);
        setHasChosenTheme(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectTheme = useCallback(async (id) => {
    if (!THEMES[id]) return;
    setThemeId(id);
    await AsyncStorage.setItem(THEME_KEY, id);
  }, []);

  const confirmThemeChoice = useCallback(async () => {
    setHasChosenTheme(true);
    await AsyncStorage.setItem(HAS_CHOSEN_THEME_KEY, 'true');
  }, []);

  const theme = THEMES[themeId];
  const colors = theme.colors;

  return (
    <ThemeContext.Provider value={{
      theme,
      themeId,
      colors,
      themes: THEMES,
      hasChosenTheme,
      loading,
      selectTheme,
      confirmThemeChoice,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
