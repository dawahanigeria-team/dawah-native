/**
 * Authentication API Service
 * Handles user authentication, registration, and account management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './base.api';
import { API_CONFIG } from '../config/api.config';

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

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await apiClient.post<AuthResponse>('/api/user_auth.php', {
        action: 'login_user',
        email_or_username: credentials.email,
        password: credentials.password,
      });

      // Convert response to User format and store
      const user: User = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
      };

      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

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
      };
      const response = await apiClient.post<AuthResponse>('/api/v2/auth/register.php', payload);

      // Convert response to User format and store
      const user: User = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
      };

      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));

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
      await AsyncStorage.removeItem(this.USER_KEY);
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
}

export const authApi = new AuthApiService();
