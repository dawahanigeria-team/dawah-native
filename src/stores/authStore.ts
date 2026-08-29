import { entity, type Plugin } from 'simpler-state';
import {
  authApi,
  type User,
  type LoginCredentials,
  type RegisterCredentials,
  type SocialLoginCredentials,
  type UpdateProfileData,
} from '../services/api/auth.api';
import { userService } from '../services/user.service';
import { cacheService } from '../services/cache/cache.service';
import { historyService } from '../services/history.service';
import { apiClient } from '../services/api/base.api';
import { clearFavorites } from './favoritesStore';
import { hydratePremiumFromUser, refreshPremiumFeatures, resetPremiumState } from './premiumStore';
import { clearListeningPreferencesForSignedOutSession } from './listeningPreferencesStore';
import { logger } from '../utils/logger';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean; // New state to track initialization
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
};

type AuthChangeListener = (isAuthenticated: boolean) => void;

const authChangeListeners = new Set<AuthChangeListener>();

/**
 * Observe sign-in and sign-out from outside React. Returns an unsubscribe.
 *
 * simpler-state entities only expose a hook, so a service that is not a
 * component - the download queue - has no other way to learn that the user
 * signed back in. This is an entity plugin rather than a call at each sign-in
 * site because there are five of them (restore, three login paths, logout,
 * refresh failure) and a sixth would silently not notify.
 */
export function subscribeToAuthChange(
  listener: AuthChangeListener,
): () => void {
  authChangeListeners.add(listener);
  return () => {
    authChangeListeners.delete(listener);
  };
}

/** Fires listeners only when `isAuthenticated` actually flips, not on every set. */
const notifyOnAuthChange: Plugin = {
  set: (origSet, target) => (...args) => {
    const was = (target.get() as AuthState).isAuthenticated;
    origSet(...args);
    const now = (target.get() as AuthState).isAuthenticated;
    if (was === now) return;

    authChangeListeners.forEach((listener) => {
      try {
        listener(now);
      } catch (error) {
        // The new auth state is already committed; a bad subscriber must not
        // take it back out or stop the others from hearing about it.
        logger.error('Auth change listener failed', error as Error);
      }
    });
  },
};

export const authStore = entity(initialState, [notifyOnAuthChange]);

let authListenerRegistered = false;

export const initializeAuth = async () => {
  authStore.set((prev) => ({ ...prev, isLoading: true }));

  if (!authListenerRegistered) {
    apiClient.setAuthTokenChangeListener((token) => {
      authStore.set((prev) => ({
        ...prev,
        isAuthenticated: !!token,
        isLoading: false,
        isInitialized: true,
      }));
    });
    apiClient.setOnRefreshFailure(async () => {
      await authApi.logout();
      await apiClient.setAuthToken(null);
      await clearListeningPreferencesForSignedOutSession();
      resetPremiumState();
      authStore.set({ ...initialState, isLoading: false, isInitialized: true });
    });
    authListenerRegistered = true;
  }

  // Migrate tokens from AsyncStorage to SecureStore on first launch after upgrade
  await authApi.migrateTokensToSecureStore();

  const [storedUser, accessToken] = await Promise.all([
    authApi.getStoredUser(),
    authApi.getAccessToken(),
  ]);

  if (accessToken && storedUser?.id) {
    await userService.setUserId(storedUser.id);
  }

  if (accessToken) {
    await apiClient.setAuthToken(accessToken);
  } else {
    await apiClient.setAuthToken(null);
  }

  if (accessToken && storedUser) {
    hydratePremiumFromUser(storedUser);
  } else {
    resetPremiumState();
  }

  authStore.set((prev) => ({
    ...prev,
    user: accessToken ? storedUser : null,
    isAuthenticated: !!accessToken,
    isLoading: false,
    isInitialized: true,
  }));

  if (accessToken) {
    refreshPremiumFeatures().catch(() => {});
  }
};

const clearLocalSessionData = async (): Promise<void> => {
  apiClient.cancelAllRequests();

  await Promise.allSettled([
    authApi.logout(),
    apiClient.setAuthToken(null),
    clearFavorites(),
    cacheService.clearAll(),
    apiClient.clearCache(),
    historyService.clearHistory(),
    userService.clearUserId(),
    clearListeningPreferencesForSignedOutSession(),
  ]);
};

export const useAuthStore = () => {
  // simpler-state's .use() is a React hook and should not be wrapped
  // in try/catch, which can corrupt hook tracking.
  const rawState = authStore.use();
  const state: AuthState = {
    ...initialState,
    ...(rawState || {}),
  };

  /**
   * Sign in with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.login(credentials);

      // Update user service with the authenticated user ID
      await userService.setUserId(user.id);

      // Set auth token in apiClient and update store
      await apiClient.setAuthToken(user.token ?? null);
      hydratePremiumFromUser(user);

      authStore.set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      });

      return user;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Sign in with a social provider (Apple, Google)
   */
  const socialLogin = async (credentials: SocialLoginCredentials) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.socialLogin(credentials);

      await userService.setUserId(user.id);
      await apiClient.setAuthToken(user.token ?? null);
      hydratePremiumFromUser(user);

      authStore.set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      });

      return user;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with social provider';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Register a new user
   */
  const register = async (credentials: RegisterCredentials) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.register(credentials);

      // Set auth token in apiClient and update store
      await apiClient.setAuthToken(user.token ?? null);
      hydratePremiumFromUser(user);

      authStore.set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      });

      return user;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to register';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Sign out the current user
   */
  const logout = async () => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      await authApi.logout();

      // Clear auth token in apiClient and update store
      await apiClient.setAuthToken(null);
      resetPremiumState();
      await clearListeningPreferencesForSignedOutSession();

      authStore.set({
        ...initialState,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign out';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Permanently delete the current user account
   */
  const deleteAccount = async () => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const currentUser = (authStore.get() || initialState).user;
      if (!currentUser?.id) {
        throw new Error('You must be signed in to delete your account');
      }

      await authApi.deleteAccount(currentUser.id);
      await clearLocalSessionData();
      resetPremiumState();

      authStore.set({
        ...initialState,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete account';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  /**
   * Clear any error messages
   */
  const clearError = () => {
    authStore.set((prev) => ({ ...prev, error: null }));
  };

  /**
   * Update the authenticated user's profile
   */
  const updateProfile = async (data: UpdateProfileData) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.updateProfile(data);

      // Update token in apiClient if new tokens were issued
      if (user.token) {
        await apiClient.setAuthToken(user.token);
      }
      hydratePremiumFromUser(user);

      authStore.set((prev) => ({
        ...prev,
        user,
        isLoading: false,
        error: null,
      }));

      return user;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update profile';
      authStore.set((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  return {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    isInitialized: state.isInitialized,

    // Actions
    login,
    socialLogin,
    register,
    logout,
    deleteAccount,
    clearError,
    updateProfile,
    initializeAuth,
  };
};
