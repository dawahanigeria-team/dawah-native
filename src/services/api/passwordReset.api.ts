/**
 * Password Reset API Service
 * Handles password recovery and reset operations
 */

import { API_CONFIG } from '../config/api.config';
import { addSentryBreadcrumb } from '../config/sentry.config';

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
  data?: {
    email: string;
    otpSent: boolean;
  };
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * Request password reset - sends 6-digit code to user's email
 * Code expires in 10 minutes
 */
export const requestPasswordReset = async (
  email: string
): Promise<RequestPasswordResetResponse> => {
  try {
    addSentryBreadcrumb('Requesting password reset', 'http', { email });

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_FORGOT_PASSWORD}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project': API_CONFIG.X_PROJECT_KEY,
          'Origin': API_CONFIG.ORIGIN,
          'Referer': API_CONFIG.REFERER,
          'User-Agent': API_CONFIG.USER_AGENT,
        },
        body: JSON.stringify({
          action: 'request_reset',
          email: email,
        }),
      }
    );

    const responseText = await response.text();
    const data = responseText
      ? (() => {
          try {
            return JSON.parse(responseText);
          } catch {
            return null;
          }
        })()
      : null;

    if (!response.ok) {
      return {
        success: false,
        message: (data && data.message) || `Request failed (${response.status})`,
      };
    }

    addSentryBreadcrumb('Password reset requested', 'info', {
      success: data?.success,
      email,
    });

    if (!data) {
      return {
        success: false,
        message: 'Invalid server response',
      };
    }

    return data;
  } catch (error) {
    console.error('Password reset request error:', error);
    throw error;
  }
};

/**
 * Reset password with 6-digit code and new password
 *
 * Requirements:
 * - Code must be 6 digits
 * - Password must be at least 8 characters
 * - Maximum 5 attempts allowed
 * - Code expires in 10 minutes
 */
export const resetPasswordWithCode = async (
  email: string,
  code: string,
  newPassword: string
): Promise<ResetPasswordResponse> => {
  try {
    addSentryBreadcrumb('Resetting password with code', 'http', { email });

    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH_FORGOT_PASSWORD}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project': API_CONFIG.X_PROJECT_KEY,
          'Origin': API_CONFIG.ORIGIN,
          'Referer': API_CONFIG.REFERER,
          'User-Agent': API_CONFIG.USER_AGENT,
        },
        body: JSON.stringify({
          action: 'reset_password',
          email: email,
          code: code,
          password: newPassword,
        }),
      }
    );

    const responseText = await response.text();
    const data = responseText
      ? (() => {
          try {
            return JSON.parse(responseText);
          } catch {
            return null;
          }
        })()
      : null;

    if (!response.ok) {
      return {
        success: false,
        message: (data && data.message) || `Request failed (${response.status})`,
      };
    }

    addSentryBreadcrumb('Password reset successful', 'info', {
      success: data?.success,
      email,
    });

    if (!data) {
      return {
        success: false,
        message: 'Invalid server response',
      };
    }

    return data;
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};
