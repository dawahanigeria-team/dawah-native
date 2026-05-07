/**
 * Authentication API Service
 * Handles user authentication, registration, and account management
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { secureStoreCompat } from '../storage/secureStoreCompat';
import { logger } from '@/utils/logger';
import type {
  PremiumFeatureFlags,
  PremiumStateSnapshot,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../types/premium.types';
import {
  DEFAULT_PREMIUM_FEATURE_FLAGS,
  DEFAULT_PREMIUM_STATE,
} from '../../types/premium.types';

export interface User {
  id: string;
  username: string;
  email: string;
  token?: string;
  created_at?: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  feature_flags: PremiumFeatureFlags;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  languageId?: number; // Added languageId
}

export interface AuthResponse {
  id: string;
  username: string;
  email: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  timestamp: number;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      languageId: string;
      user_type: string;
      is_social: boolean;
      created_at?: string;
      createdAt?: string;
      plan?: SubscriptionPlan;
      subscription_status?: SubscriptionStatus;
      feature_flags?: Partial<PremiumFeatureFlags>;
    };
    tokens: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  timestamp: number;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      languageId: string;
      created_at?: string;
      createdAt?: string;
      plan?: SubscriptionPlan;
      subscription_status?: SubscriptionStatus;
      feature_flags?: Partial<PremiumFeatureFlags>;
    };
    tokens: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
  };
}

export interface SocialLoginCredentials {
  provider: 'apple' | 'google';
  identityToken: string;
  email?: string | null;
  fullName?: string | null;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  languageId?: number;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  timestamp: number;
  data: {
    user: {
      id: number;
      username: string;
      email: string;
      languageId: string;
      user_type: string;
      is_social: boolean;
      created_at?: string;
      createdAt?: string;
      plan?: SubscriptionPlan;
      subscription_status?: SubscriptionStatus;
      feature_flags?: Partial<PremiumFeatureFlags>;
    };
    tokens?: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
  };
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  email: string;
  code: string;
  newPassword: string;
}

interface DeleteAccountPayload {
  confirm: true;
  userId: number | string;
}

interface DeleteAccountLegacyPayload extends DeleteAccountPayload {
  action: 'delete_account';
}

class AuthApiService {
  private readonly USER_KEY = 'user_data';
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly LEGACY_AUTH_TOKEN_KEY = 'auth_token';
  private migrationComplete = false;

  private getUserCreatedAt(value: { created_at?: string; createdAt?: string }): string | undefined {
    if (typeof value.created_at === 'string' && value.created_at.trim().length > 0) {
      return value.created_at;
    }
    if (typeof value.createdAt === 'string' && value.createdAt.trim().length > 0) {
      return value.createdAt;
    }
    return undefined;
  }

  private getPremiumFields(value: {
    plan?: SubscriptionPlan;
    subscription_status?: SubscriptionStatus;
    feature_flags?: Partial<PremiumFeatureFlags>;
  }): PremiumStateSnapshot {
    return {
      ...DEFAULT_PREMIUM_STATE,
      plan: value.plan ?? DEFAULT_PREMIUM_STATE.plan,
      subscription_status:
        value.subscription_status ?? DEFAULT_PREMIUM_STATE.subscription_status,
      feature_flags: {
        ...DEFAULT_PREMIUM_FEATURE_FLAGS,
        ...(value.feature_flags ?? {}),
      },
    };
  }

  private buildUser(
    value: {
      id: number | string;
      username: string;
      email: string;
      created_at?: string;
      createdAt?: string;
      plan?: SubscriptionPlan;
      subscription_status?: SubscriptionStatus;
      feature_flags?: Partial<PremiumFeatureFlags>;
    },
    token?: string,
  ): User {
    return {
      id: value.id.toString(),
      username: value.username,
      email: value.email,
      token,
      created_at: this.getUserCreatedAt(value),
      ...this.getPremiumFields(value),
    };
  }

  private buildDeleteAccountPayload(userId: string): DeleteAccountPayload {
    const numericUserId = Number(userId);
    return {
      confirm: true,
      userId: Number.isFinite(numericUserId) ? numericUserId : userId,
    };
  }

  /**
   * Migrate tokens from AsyncStorage to SecureStore (one-time).
   * Ensures existing users don't get logged out on upgrade.
   */
  async migrateTokensToSecureStore(): Promise<void> {
    if (this.migrationComplete) return;
    this.migrationComplete = true;

    try {
      const keys = [this.ACCESS_TOKEN_KEY, this.REFRESH_TOKEN_KEY, this.LEGACY_AUTH_TOKEN_KEY];
      for (const key of keys) {
        const existing = await secureStoreCompat.getItemAsync(key);
        if (existing) continue;

        const legacy = await AsyncStorage.getItem(key);
        if (legacy) {
          await secureStoreCompat.setItemAsync(key, legacy);
          await AsyncStorage.removeItem(key);
        }
      }
    } catch (error) {
      logger.error('Token migration failed:', error, {
        operation: 'auth_migrate_tokens',
      });
    }
  }

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiClient.post<LoginResponse>('/api/user_auth.php', {
        action: 'login_user',
        email_or_username: credentials.email,
        password: credentials.password,
      });

      // Extract user data from response
      const user = this.buildUser(response.data.data.user, response.data.data.tokens.access_token);

      // Store user data (not sensitive) in AsyncStorage
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

      // Store tokens in SecureStore
      await secureStoreCompat.setItemAsync(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
      await secureStoreCompat.setItemAsync(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);
      await secureStoreCompat.setItemAsync(this.LEGACY_AUTH_TOKEN_KEY, response.data.data.tokens.access_token);

      return user;
    } catch (error) {
      logger.error('Login error:', error, {
        operation: 'auth_login',
        email: credentials.email,
      });
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    try {
      const payload = {
        action: 'register_user',
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        languageId: credentials.languageId || API_CONFIG.DEFAULT_LANGUAGE_ID,
        is_social: false,
      };
      const response = await apiClient.post<RegisterResponse>('/api/user_auth.php', payload);

      // Extract user data from response
      const user = this.buildUser(response.data.data.user, response.data.data.tokens.access_token);

      // Store user data (not sensitive) in AsyncStorage
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

      // Store tokens in SecureStore
      await secureStoreCompat.setItemAsync(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
      await secureStoreCompat.setItemAsync(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);
      await secureStoreCompat.setItemAsync(this.LEGACY_AUTH_TOKEN_KEY, response.data.data.tokens.access_token);

      return user;
    } catch (error) {
      logger.error('Registration error:', error, {
        operation: 'auth_register',
        email: credentials.email,
        username: credentials.username,
      });
      throw error;
    }
  }

  /**
   * Sign in with a social provider (Apple, Google)
   */
  async socialLogin(credentials: SocialLoginCredentials): Promise<User> {
    try {
      const payload: Record<string, unknown> = {
        action: 'social_login',
        provider: credentials.provider,
        identity_token: credentials.identityToken,
        is_social: true,
      };

      if (credentials.email) {
        payload.email = credentials.email;
      }
      if (credentials.fullName) {
        payload.full_name = credentials.fullName;
      }

      const response = await apiClient.post<LoginResponse>('/api/user_auth.php', payload);

      const user = this.buildUser(response.data.data.user, response.data.data.tokens.access_token);

      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      await secureStoreCompat.setItemAsync(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
      await secureStoreCompat.setItemAsync(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);
      await secureStoreCompat.setItemAsync(this.LEGACY_AUTH_TOKEN_KEY, response.data.data.tokens.access_token);

      return user;
    } catch (error) {
      logger.error('Social login error:', error, {
        operation: 'auth_social_login',
        provider: credentials.provider,
        email: credentials.email ?? null,
      });
      throw error;
    }
  }

  /**
   * Update the authenticated user's profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const payload: Record<string, unknown> = {
        action: 'update_profile',
      };
      if (data.username !== undefined) payload.username = data.username;
      if (data.email !== undefined) payload.email = data.email;
      if (data.languageId !== undefined) payload.languageId = data.languageId;

      const response = await apiClient.post<UpdateProfileResponse>('/api/user_auth.php', payload);

      const user = this.buildUser(
        response.data.data.user,
        response.data.data.tokens?.access_token || accessToken,
      );

      // Update stored user data
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

      // Update tokens if returned (email/username change triggers new tokens)
      if (response.data.data.tokens) {
        await secureStoreCompat.setItemAsync(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
        await secureStoreCompat.setItemAsync(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);
        await secureStoreCompat.setItemAsync(this.LEGACY_AUTH_TOKEN_KEY, response.data.data.tokens.access_token);
      }

      return user;
    } catch (error) {
      logger.error('Update profile error:', error, {
        operation: 'auth_update_profile',
      });
      throw error;
    }
  }

  /**
   * Delete account (recommended endpoint with legacy fallback)
   */
  async deleteAccount(userId: string): Promise<void> {
    if (!userId?.trim()) {
      throw new Error('Missing user ID');
    }

    const payload = this.buildDeleteAccountPayload(userId);

    try {
      await apiClient.post('/api/delete_account.php', payload, {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: false,
        retry: false,
      });
      return;
    } catch (error) {
      const shouldFallback =
        error instanceof ApiError &&
        (error.statusCode === 404 || error.statusCode === 405 || error.statusCode === 501);

      if (!shouldFallback) {
        throw error;
      }
    }

    const fallbackPayload: DeleteAccountLegacyPayload = {
      ...payload,
      action: 'delete_account',
    };

    await apiClient.post('/api/user_auth.php', fallbackPayload, {
      timeout: API_CONFIG.TIMEOUTS.DEFAULT,
      useCache: false,
      retry: false,
    });
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      // Remove non-sensitive user data from AsyncStorage
      await AsyncStorage.removeItem(this.USER_KEY);

      // Remove tokens from SecureStore
      await secureStoreCompat.deleteItemAsync(this.ACCESS_TOKEN_KEY);
      await secureStoreCompat.deleteItemAsync(this.REFRESH_TOKEN_KEY);
      await secureStoreCompat.deleteItemAsync(this.LEGACY_AUTH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to clear user data:', error, {
        operation: 'auth_logout',
      });
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      if (!userData) return null;
      const parsed = JSON.parse(userData) as Partial<User> | null;
      if (!parsed?.id || !parsed.username || !parsed.email) return null;
      return {
        id: parsed.id.toString(),
        username: parsed.username,
        email: parsed.email,
        token: parsed.token,
        created_at: parsed.created_at,
        ...this.getPremiumFields(parsed),
      };
    } catch (error) {
      logger.error('Failed to get stored user:', error, {
        operation: 'auth_get_stored_user',
      });
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getStoredUser();
    return !!user;
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const accessToken = await secureStoreCompat.getItemAsync(this.ACCESS_TOKEN_KEY);
      if (accessToken) {
        return accessToken;
      }
      return await secureStoreCompat.getItemAsync(this.LEGACY_AUTH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get access token:', error, {
        operation: 'auth_get_access_token',
      });
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await secureStoreCompat.getItemAsync(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      logger.error('Failed to get refresh token:', error, {
        operation: 'auth_get_refresh_token',
      });
      return null;
    }
  }

  /**
   * Update stored access token
   */
  async setAccessToken(token: string): Promise<void> {
    try {
      await secureStoreCompat.setItemAsync(this.ACCESS_TOKEN_KEY, token);
      await secureStoreCompat.setItemAsync(this.LEGACY_AUTH_TOKEN_KEY, token);
    } catch (error) {
      logger.error('Failed to set access token:', error, {
        operation: 'auth_set_access_token',
      });
    }
  }
}

export const authApi = new AuthApiService();
