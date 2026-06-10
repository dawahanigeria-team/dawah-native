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

interface RawLecturerFollowResponseData {
  following?: boolean;
  lecturerId?: number | string;
  lecturer_id?: number | string;
  lecturerType?: LecturerFollowType;
  lecturer_type?: LecturerFollowType;
  upserted?: boolean;
  deleted?: number;
}

interface RawLecturerFollowResponse {
  success?: boolean;
  message?: string;
  following?: boolean;
  data?: RawLecturerFollowResponseData;
}

interface LecturerFollowPayload {
  lecturerId: number;
  type: LecturerFollowType;
  action: LecturerFollowAction;
}

const normalizeLecturerFollowResponse = (
  response: RawLecturerFollowResponse,
  payload: LecturerFollowPayload,
): LecturerFollowResponse => {
  const following = response?.data?.following ?? response?.following;

  if (response?.success !== true || typeof following !== 'boolean') {
    throw new ApiError(response?.message || 'Failed to update lecturer follow status');
  }

  const lecturerId = response.data?.lecturerId ?? response.data?.lecturer_id ?? payload.lecturerId;
  const lecturerType = response.data?.lecturerType ?? response.data?.lecturer_type ?? payload.type;
  const normalized: LecturerFollowResponse = {
    success: true,
    data: {
      following,
      lecturerId,
      lecturerType,
    },
  };

  if (response.message) {
    normalized.message = response.message;
  }

  if (typeof response.following === 'boolean') {
    normalized.following = response.following;
  }

  if (typeof response.data?.upserted === 'boolean') {
    normalized.data.upserted = response.data.upserted;
  }

  if (typeof response.data?.deleted === 'number') {
    normalized.data.deleted = response.data.deleted;
  }

  return normalized;
};

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

    const response = await apiClient.post<RawLecturerFollowResponse>(
      API_CONFIG.ENDPOINTS.LECTURER_FOLLOW,
      payload,
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: false,
      },
    );

    return normalizeLecturerFollowResponse(response.data, payload);
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
