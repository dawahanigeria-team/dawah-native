/**
 * Favorites Store
 * Global state management for liked lectures
 */

import { entity } from 'simpler-state';
import { favoritesApi } from '../services/api/favorites.api';
import { addSentryBreadcrumb, captureSentryException } from '../services/config/sentry.config';

interface FavoritesState {
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
}

const initialState: FavoritesState = {
  favoriteIds: [],
  loading: false,
  error: null,
};

const favoritesStore = entity(initialState);

/**
 * Fetch favorite lecture IDs (works offline)
 */
export const fetchFavorites = async (): Promise<void> => {
  const currentState = favoritesStore.get() || initialState;

  try {
    favoritesStore.set({ ...currentState, loading: true, error: null });

    addSentryBreadcrumb('Fetching favorites', 'query');

    // This will return cached IDs if offline
    const ids = await favoritesApi.getFavoriteIds('audio');

    favoritesStore.set({
      ...currentState,
      favoriteIds: ids,
      loading: false,
      error: null,
    });

    console.log(`✅ Loaded ${ids.length} favorites into store`);
  } catch (error: any) {
    // Network errors are normal - don't show as errors
    if (error.isNetworkError) {
      console.log('📱 Using cached favorites (offline)');
    } else {
      console.warn('⚠️ Could not fetch favorites:', error.message);
      // Don't report network errors to Sentry
      if (!error.isNetworkError) {
        captureSentryException(error, {
          component: 'favoritesStore',
          action: 'fetchFavorites',
          level: 'warning',
        });
      }
    }

    // Still set loading to false, but don't set error state for network issues
    favoritesStore.set({
      ...currentState,
      loading: false,
      error: error.isNetworkError ? null : (error.message || 'Failed to load favorites'),
    });
  }
};

/**
 * Toggle favorite (add/remove)
 */
export const toggleFavorite = async (lectureId: string): Promise<boolean> => {
  const currentState = favoritesStore.get() || initialState;
  const favoriteIds = Array.isArray(currentState.favoriteIds) ? currentState.favoriteIds : [];
  const wasFavorited = favoriteIds.includes(lectureId);

  try {
    addSentryBreadcrumb('Toggling favorite', 'user', { lectureId, wasFavorited });

    // Optimistic update
    const updatedIds = wasFavorited
      ? favoriteIds.filter(id => id !== lectureId)
      : [...favoriteIds, lectureId];

    favoritesStore.set({
      ...currentState,
      favoriteIds: updatedIds,
    });

    // Call API
    const response = await favoritesApi.toggleFavorite(lectureId, 'audio');

    console.log(`✅ ${response.message}`);

    return !wasFavorited; // Return new state
  } catch (error: any) {
    console.error('Failed to toggle favorite:', error);

    captureSentryException(error, {
      component: 'favoritesStore',
      action: 'toggleFavorite',
      lectureId,
    });

    // Revert optimistic update on error
    favoritesStore.set(currentState);

    throw error;
  }
};

/**
 * Check if lecture is favorited
 */
export const isFavorited = (lectureId: string): boolean => {
  const state = favoritesStore.get() || initialState;
  const favoriteIds = Array.isArray(state.favoriteIds) ? state.favoriteIds : [];
  return favoriteIds.includes(lectureId);
};

/**
 * Clear favorites (logout)
 */
export const clearFavorites = async (): Promise<void> => {
  await favoritesApi.clearAll();
  favoritesStore.set(initialState);
};

/**
 * Hook to use favorites store
 */
export const useFavoritesStore = () => {
  const rawState = favoritesStore.use();
  const state: FavoritesState = {
    ...initialState,
    ...(rawState || {}),
    favoriteIds: Array.isArray(rawState?.favoriteIds) ? rawState.favoriteIds : [],
  };

  return {
    ...state,
    fetchFavorites,
    toggleFavorite,
    isFavorited,
    clearFavorites,
  };
};

export default favoritesStore;
