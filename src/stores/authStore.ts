import { entity } from 'simpler-state';
import {
  authApi,
  type User,
  type LoginCredentials,
  type RegisterCredentials,
} from '../services/api/auth.api';
import { userService } from '../services/user.service';
import { apiClient } from '../services/api/base.api'; // Import apiClient

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

export const authStore = entity(initialState);

export const useAuthStore = () => {
  let state: AuthState;

  try {
    state = authStore.use();
  } catch (error) {
    console.warn('AuthStore initialization issue, using default state:', error);
    state = initialState;
  }

  if (!state) {
    state = initialState;
  }

  /**
   * Initialize authentication state from storage
   * This should be called once when the app starts.
   */
  const initializeAuth = async () => {
    authStore.set((prev) => ({ ...prev, isLoading: true }));
    // ApiClient's loadAuthToken will call the registered listener
    // We don't need to explicitly call it here, as it's called in ApiClient constructor
    // but we need to ensure the listener is set up before it potentially loads.
    apiClient.setAuthTokenChangeListener((token) => {
      authStore.set((prev) => ({
        ...prev,
        isAuthenticated: !!token,
        isLoading: false,
        isInitialized: true,
      }));
    });
    // Trigger a re-load of the token in case the listener was set up after the initial load
    // This ensures the authStore is always in sync.
    await apiClient.loadAuthToken();
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
      await apiClient.setAuthToken(user.token);

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
   * Register a new user
   */
  const register = async (credentials: RegisterCredentials) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.register(credentials);

      // Set auth token in apiClient and update store
      await apiClient.setAuthToken(user.token);

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
   * Clear any error messages
   */
  const clearError = () => {
    authStore.set((prev) => ({ ...prev, error: null }));
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
    register,
    logout,
    clearError,
    initializeAuth,
  };
};
