import { entity } from "simpler-state";

interface ThemeState {
  isDark: boolean;
}

const initialState: ThemeState = {
  isDark: true, // Default to dark mode
};

export const themeStore = entity(initialState);

export const useThemeStore = () => {
  const state = themeStore.use();

  const toggleTheme = () => {
    themeStore.set({
      ...state,
      isDark: !state.isDark,
    });
  };

  const setTheme = (isDark: boolean) => {
    themeStore.set({
      ...state,
      isDark,
    });
  };

  return {
    ...state,
    toggleTheme,
    setTheme,
  };
};
