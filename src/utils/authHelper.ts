/**
 * Authentication Helper Utilities
 * Provides convenient methods for authentication operations
 */

import { authApi, type LoginCredentials } from '../services/api/auth.api';

export interface LoginRequest {
  action: 'login_user';
  email_or_username: string;
  password: string;
}

/**
 * Convert login request format to API credentials format
 */
export function convertLoginRequest(request: LoginRequest): LoginCredentials {
  return {
    email: request.email_or_username,
    password: request.password,
  };
}

/**
 * Perform login with the provided credentials
 */
export async function performLogin(credentials: LoginCredentials) {
  try {
    const user = await authApi.login(credentials);
    return {
      success: true,
      user,
      message: 'Login successful'
    };
  } catch (error: any) {
    return {
      success: false,
      user: null,
      message: error.message || 'Login failed'
    };
  }
}

/**
 * Login with the specific format you provided
 */
export async function loginWithRequest(request: LoginRequest) {
  const credentials = convertLoginRequest(request);
  return await performLogin(credentials);
}

// Example usage with your specific credentials:
export const exampleLoginRequest: LoginRequest = {
  action: 'login_user',
  email_or_username: '{{loginIdentifier}}', // Replace with actual email/username
  password: 'Islam123.'
};

/**
 * Quick login function for testing
 */
export async function quickLogin() {
  const request: LoginRequest = {
    action: 'login_user',
    email_or_username: '{{loginIdentifier}}', // Replace with actual email/username
    password: 'Islam123.'
  };
  
  return await loginWithRequest(request);
}
