/**
 * Lecturer Follow API
 * Handles follow/unfollow actions for lecturers (resource persons or reciters)
 */

import { apiClient, ApiError } from './base.api';
import { API_CONFIG } from '../config/api.config';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';

export type LecturerFollowType = 'rp' | 'reciter';
export type LecturerFollowAction = 'follow' | 'unfollow';

export interface LecturerFollowResponseData {
  following: boolean;
  lecturerId: number | string;
  lecturerType: LecturerFollowType;
  upserted?: boolean;
  deleted?: number;
}

export interface LecturerFollowResponse {
  success: boolean;
  data: LecturerFollowResponseData;
  message?: string;
  following?: boolean;
}

interface LecturerFollowPayload {
  lecturerId: number;
  type: LecturerFollowType;
  action: LecturerFollowAction;
}

const toggleLecturerFollow = async (
  lecturerId: string | number,
  action: LecturerFollowAction,
  type: LecturerFollowType = 'rp',
): Promise<LecturerFollowResponse> => {
  try {
    const payload: LecturerFollowPayload = {
      lecturerId: Number(lecturerId),
      type,
      action,
    };

    addSentryBreadcrumb('Lecturer follow toggle', 'user', {
      lecturerId: payload.lecturerId,
      type,
      action,
    });

    const response = await apiClient.post<LecturerFollowResponse>(
      API_CONFIG.ENDPOINTS.LECTURER_FOLLOW,
      payload,
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: false,
      },
    );

    return response.data;
  } catch (error) {
    console.error('Failed to toggle lecturer follow:', error);
    captureSentryException(error as Error, {
      component: 'LecturerFollowApi',
      action,
      lecturerId: String(lecturerId),
      type,
    });

    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update lecturer follow status', undefined, error);
  }
};

export const followLecturer = async (
  lecturerId: string | number,
  type: LecturerFollowType = 'rp',
): Promise<LecturerFollowResponse> => {
  return toggleLecturerFollow(lecturerId, 'follow', type);
};

export const unfollowLecturer = async (
  lecturerId: string | number,
  type: LecturerFollowType = 'rp',
): Promise<LecturerFollowResponse> => {
  return toggleLecturerFollow(lecturerId, 'unfollow', type);
};
