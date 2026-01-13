/**
 * Authentication API Service
 * Handles user authentication, registration, and account management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';

export interface User {
  id: string;
  username: string;
  email: string;
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
    };
    tokens: {
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

class AuthApiService {
  private readonly USER_KEY = 'user_data';
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

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
      const user: User = {
        id: response.data.data.user.id.toString(),
        username: response.data.data.user.username,
        email: response.data.data.user.email,
      };

      // Store user data and tokens
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
      await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);

      return user;
    } catch (error) {
      console.error('Login error:', error);
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
      const user: User = {
        id: response.data.data.user.id.toString(),
        username: response.data.data.user.username,
        email: response.data.data.user.email,
      };

      // Store user data and tokens
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(this.ACCESS_TOKEN_KEY, response.data.data.tokens.access_token);
      await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, response.data.data.tokens.refresh_token);

      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.USER_KEY,
        this.ACCESS_TOKEN_KEY,
        this.REFRESH_TOKEN_KEY,
      ]);
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  /**
   * Get stored user data
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
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
      return await AsyncStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * Update stored access token
   */
  async setAccessToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to set access token:', error);
    }
  }
}

export const authApi = new AuthApiService();
