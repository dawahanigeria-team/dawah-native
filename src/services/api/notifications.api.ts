/**
 * Notifications API
 * Handles push token registration with backend
 */

import { ENV } from '@/config/env';
import { apiClient, type ApiResponse } from './base.api';

export interface RegisterPushTokenPayload {
  userId: string;
  expoPushToken: string;
  platform: 'ios' | 'android' | 'web';
  preferences?: Record<string, boolean>;
  device?: {
    model?: string | null;
    os?: string | null;
  };
}

export interface RegisterPushTokenResponse {
  success: boolean;
  message?: string;
}

/**
 * Validate Expo push token format
 * Valid format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx] or ExpoPushToken[...]
 */
const isValidExpoPushToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const validPattern = /^Expo(nent)?PushToken\[.+\]$/;
  return validPattern.test(token);
};

export const registerPushToken = async (
  payload: RegisterPushTokenPayload,
): Promise<ApiResponse<RegisterPushTokenResponse> | null> => {
  if (!ENV.PUSH_NOTIFICATIONS_REGISTER_URL) {
    console.warn('Push token registration URL not configured in environment variables.');
    console.warn('Set EXPO_PUBLIC_PUSH_REGISTER_URL in your .env file.');
    return null;
  }

  // Validate token format before sending to backend
  if (!isValidExpoPushToken(payload.expoPushToken)) {
    console.error('Invalid Expo push token format:', payload.expoPushToken);
    console.error('Expected format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
    console.error('This is a known Expo bug: https://github.com/expo/expo/issues/22903');
    return null;
  }

  try {
    return await apiClient.post<RegisterPushTokenResponse>(
      ENV.PUSH_NOTIFICATIONS_REGISTER_URL,
      payload,
      {
        timeout: 15000,
        retry: true,
        retryAttempts: 3,
      },
    );
  } catch (error) {
    console.warn('Failed to register push token with backend:', error);
    return null;
  }
};
