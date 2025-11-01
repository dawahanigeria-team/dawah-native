import { entity } from 'simpler-state';
import {
  authApi,
  type User,
  type LoginCredentials,
  type RegisterCredentials,
} from '../services/api/auth.api';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
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
   * Sign in with email and password
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      authStore.set((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await authApi.login(credentials);

      authStore.set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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

      authStore.set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
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

      authStore.set({
        ...initialState,
        isLoading: false,
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

    // Actions
    login,
    register,
    logout,
    clearError,
  };
};
