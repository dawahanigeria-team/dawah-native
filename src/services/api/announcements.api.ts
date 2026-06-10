/**
 * Announcements API Service
 * Handles fetching and managing announcements/notifications
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { logger } from '@/utils/logger';

export interface AnnouncementApiResponse {
  id: string;
  title: string;
  message: string;
  body?: string;
  created_at: string;
  type?: string;
  icon?: string;
  read?: boolean;
  [key: string]: any;
}

export interface AnnouncementsListResponse {
  success: boolean;
  data: AnnouncementApiResponse[];
  unread_count?: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  message?: string;
}

class AnnouncementsApiService {
  /**
   * Fetch all announcements for the user
   */
  async getAnnouncements(userId?: string): Promise<AnnouncementsListResponse> {
    try {
      const params: Record<string, any> = {};
      if (userId) {
        params.user_id = userId;
      }

      logger.debug('Announcements API Call:', {
        endpoint: '/api/announcements.php',
        params,
      });

      const response = await apiClient.get<any>(
        '/api/announcements.php',
        params,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 60, // Cache for 1 minute
        }
      );

      logger.debug('Announcements Response:', {
        status: 'success',
        dataLength: Array.isArray(response.data) ? response.data.length : 0,
      });

      return this.normalizeResponse(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.isCancelled) {
        throw error;
      }
      // Don't log "Invalid user_id" errors - expected for guest/new users
      const errorMessage = error instanceof Error ? error.message : '';
      if (
        !errorMessage.includes('Invalid user_id') &&
        !(error instanceof ApiError && error.isCancelled)
      ) {
        logger.error('❌ Announcements API Error:', error, {
          operation: 'announcements_get',
        });
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch announcements', undefined, error);
    }
  }

  /**
   * Mark an announcement as read
   */
  async markAsRead(announcementId: string, userId?: string): Promise<MarkAsReadResponse> {
    try {
      const formData = new FormData();
      formData.append('announcement_id', announcementId);
      if (userId) {
        formData.append('user_id', userId);
      }

      logger.debug('Mark as Read API Call:', {
        endpoint: '/api/mark_announcement_read.php',
        announcementId,
      });

      const response = await apiClient.post<any>(
        '/api/mark_announcement_read.php',
        formData,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        }
      );

      return {
        success: true,
        message: response.data?.message,
      };
    } catch (error) {
      logger.error('❌ Mark as Read API Error:', error, {
        operation: 'announcements_mark_read',
        announcementId,
      });
      throw new ApiError('Failed to mark announcement as read', undefined, error);
    }
  }

  /**
   * Get unread announcements count
   */
  async getUnreadCount(userId?: string): Promise<number> {
    try {
      const response = await this.getAnnouncements(userId);
      return response.unread_count || response.data.filter(a => !a.read).length;
    } catch (error) {
      if (error instanceof ApiError && error.isCancelled) {
        return 0;
      }
      // Don't log "Invalid user_id" errors - expected for guest/new users
      const errorMessage = error instanceof Error ? error.message : '';
      if (
        !errorMessage.includes('Invalid user_id') &&
        !(error instanceof ApiError && error.isCancelled)
      ) {
        logger.error('❌ Failed to get unread count:', error, {
          operation: 'announcements_unread_count',
        });
      }
      return 0;
    }
  }

  /**
   * Normalize API response
   */
  private normalizeResponse(data: any): AnnouncementsListResponse {
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch announcements', data.statusCode);
    }

    let announcements = [];
    if (Array.isArray(data)) {
      announcements = data;
    } else if (data?.data) {
      announcements = data.data;
    } else if (data?.announcements) {
      announcements = data.announcements;
    }

    const unreadCount = data?.unread_count || announcements.filter((a: any) => !a.read).length;

    return {
      success: true,
      data: announcements,
      unread_count: unreadCount,
    };
  }
}

// Export singleton instance
export const announcementsApi = new AnnouncementsApiService();
