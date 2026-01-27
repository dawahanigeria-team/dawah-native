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

export const registerPushToken = async (
  payload: RegisterPushTokenPayload,
): Promise<ApiResponse<RegisterPushTokenResponse> | null> => {
  if (!ENV.PUSH_NOTIFICATIONS_REGISTER_URL) {
    console.warn('Push token registration URL not configured.');
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
    console.warn('Failed to register push token:', error);
    return null;
  }
};
