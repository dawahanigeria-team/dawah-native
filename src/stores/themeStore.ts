import AsyncStorage from '@react-native-async-storage/async-storage';
import { entity } from "simpler-state";

interface ThemeState {
  isDark: boolean;
}

const THEME_KEY = 'app_theme';

const initialState: ThemeState = {
  isDark: true, // Default to dark mode
};

export const themeStore = entity(initialState);

// Load saved theme preference
AsyncStorage.getItem(THEME_KEY).then((theme) => {
  if (theme !== null) {
    themeStore.set({ isDark: theme === 'dark' });
  }
}).catch((error) => {
  console.error('Failed to load theme preference:', error);
});

export const useThemeStore = () => {
  const state = themeStore.use();

  const toggleTheme = async () => {
    const newIsDark = !state.isDark;
    themeStore.set({
      ...state,
      isDark: newIsDark,
    });
    try {
      await AsyncStorage.setItem(THEME_KEY, newIsDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = async (isDark: boolean) => {
    themeStore.set({
      ...state,
      isDark,
    });
    try {
      await AsyncStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  return {
    ...state,
    toggleTheme,
    setTheme,
  };
};
