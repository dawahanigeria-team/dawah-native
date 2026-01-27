/**
 * Video API Service
 * Handles fetching video data from YouTube listings
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';

export interface VideoListParams {
  page?: number;
  limit?: number;
}

export interface VideoDetailParams {
  id: string;
}

export interface VideoShareParams {
  user_id?: string;
  item_id: string;
}

export interface VideoFavoriteParams {
  user_id?: string;
  item_id: string;
}

export interface VideoCommentParams {
  user_id?: string;
  item_id: string;
  comment: string;
}

export interface VideoCommentsListParams {
  item_id: string;
  user_id?: string;
  page?: number;
}

export interface VideoApiResponse {
  id: string;
  nid?: string;
  title?: string;
  Title?: string;
  youtube_url?: string;
  youtube_id?: string;
  thumbnail?: string;
  img?: string;
  description?: string;
  duration?: string;
  Duration?: string;
  views?: number | string;
  Plays?: number | string;
  likes?: number | string;
  created_at?: string;
  CreatedAt?: string;
  post_date?: string;
  lecturer_name?: string;
  rpname?: string;
  language?: string;
  lang?: string;
  [key: string]: any;
}

export interface VideoListResponse {
  success: boolean;
  data: VideoApiResponse[];
  page: number;
  total: number;
  total_pages: number;
  per_page: number;
}

export interface VideoDetailResponse {
  success: boolean;
  data: VideoApiResponse;
}

export interface ShareResponse {
  success: boolean;
  url: string;
  message?: string;
}

export interface FavoriteResponse {
  success: boolean;
  message?: string;
}

export interface CommentResponse {
  success: boolean;
  message?: string;
}

export interface CommentsListResponse {
  success: boolean;
  data: any[];
  page: number;
  total: number;
}

class VideoApiService {
  /**
   * Fetch all videos with pagination
   */
  async getVideos(params: VideoListParams = {}): Promise<VideoListResponse> {
    try {
      const requestParams: Record<string, any> = {
        action: 'allVideo',
        page: params.page || 1,
      };

      if (params.limit) {
        requestParams.limit = params.limit;
      }

      console.log('🎥 Video List API Call:', {
        endpoint: '/api/video_listingApi.php',
        params: requestParams,
      });

      const response = await apiClient.get<any>(
        '/api/video_listingApi.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 300, // Cache for 5 minutes
        }
      );

      console.log('📥 Video List Response:', {
        status: 'success',
        dataLength: Array.isArray(response.data) ? response.data.length : 0,
      });

      return this.normalizeListResponse(response.data, params);
    } catch (error) {
      console.error('❌ Video List API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch videos', undefined, error);
    }
  }

  /**
   * Fetch single video detail (increments view count)
   */
  async getVideoDetail(params: VideoDetailParams): Promise<VideoDetailResponse> {
    try {
      const requestParams: Record<string, any> = {
        action: 'singleVideo',
        id: params.id,
      };

      console.log('🎥 Video Detail API Call:', {
        endpoint: '/api/video_listingApi.php',
        params: requestParams,
      });

      const response = await apiClient.get<any>(
        '/api/video_listingApi.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: false, // Don't cache to avoid inflating view counts
        }
      );

      console.log('📥 Video Detail Response:', {
        status: 'success',
        videoId: params.id,
      });

      return this.normalizeDetailResponse(response.data);
    } catch (error) {
      console.error('❌ Video Detail API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch video detail', undefined, error);
    }
  }

  /**
   * Share a video
   */
  async shareVideo(params: VideoShareParams): Promise<ShareResponse> {
    try {
      const formData = new FormData();
      formData.append('type', 'video');
      formData.append('item_id', params.item_id);
      if (params.user_id) {
        formData.append('user_id', params.user_id);
      }

      console.log('📤 Video Share API Call:', {
        endpoint: '/api/shareApi.php',
        params,
      });

      const response = await apiClient.post<any>(
        '/api/shareApi.php',
        formData,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        }
      );

      return {
        success: true,
        url: response.data?.url || '',
        message: response.data?.message,
      };
    } catch (error) {
      console.error('❌ Video Share API Error:', error);
      throw new ApiError('Failed to share video', undefined, error);
    }
  }

  /**
   * Toggle video favorite
   */
  async toggleFavorite(params: VideoFavoriteParams): Promise<FavoriteResponse> {
    try {
      const formData = new FormData();
      formData.append('type', 'video');
      formData.append('item_id', params.item_id);
      if (params.user_id) {
        formData.append('user_id', params.user_id);
      }

      console.log('❤️ Video Favorite API Call:', {
        endpoint: '/api/leclisting_fates.php',
        params,
      });

      const response = await apiClient.post<any>(
        '/api/leclisting_fates.php',
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
      console.error('❌ Video Favorite API Error:', error);
      throw new ApiError('Failed to toggle favorite', undefined, error);
    }
  }

  /**
   * Create a comment on a video
   */
  async createComment(params: VideoCommentParams): Promise<CommentResponse> {
    try {
      const formData = new FormData();
      formData.append('type', 'video');
      formData.append('item_id', params.item_id);
      formData.append('comment', params.comment);
      if (params.user_id) {
        formData.append('user_id', params.user_id);
      }

      console.log('💬 Video Comment API Call:', {
        endpoint: '/api/commentApi.php',
        params: { ...params, comment: '[hidden for logs]' },
      });

      const response = await apiClient.post<any>(
        '/api/commentApi.php',
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
      console.error('❌ Video Comment API Error:', error);
      throw new ApiError('Failed to create comment', undefined, error);
    }
  }

  /**
   * Get comments for a video
   */
  async getComments(params: VideoCommentsListParams): Promise<CommentsListResponse> {
    try {
      const requestParams: Record<string, any> = {
        type: 'video',
        item_id: params.item_id,
      };

      if (params.user_id) {
        requestParams.user_id = params.user_id;
      }

      if (params.page) {
        requestParams.page = params.page;
      }

      console.log('💬 Video Comments List API Call:', {
        endpoint: '/api/commentApi.php',
        params: requestParams,
      });

      const response = await apiClient.get<any>(
        '/api/commentApi.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 60, // Cache for 1 minute
        }
      );

      const comments = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      return {
        success: true,
        data: comments,
        page: params.page || 1,
        total: comments.length,
      };
    } catch (error) {
      console.error('❌ Video Comments List API Error:', error);
      throw new ApiError('Failed to fetch comments', undefined, error);
    }
  }

  /**
   * Normalize video list response
   */
  private normalizeListResponse(
    data: any,
    params: VideoListParams
  ): VideoListResponse {
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch videos', data.statusCode);
    }

    let videos = [];
    if (Array.isArray(data)) {
      videos = data;
    } else if (data?.data) {
      videos = data.data;
    } else if (data?.results) {
      videos = data.results;
    }

    return {
      success: true,
      data: videos,
      page: params.page || 1,
      total: videos.length,
      total_pages: 1,
      per_page: videos.length,
    };
  }

  /**
   * Normalize video detail response
   */
  private normalizeDetailResponse(data: any): VideoDetailResponse {
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch video detail', data.statusCode);
    }

    const video = data?.data || data;

    return {
      success: true,
      data: video,
    };
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  extractYouTubeId(url: string): string | null {
    if (!url) return null;

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

// Export singleton instance
export const videoApi = new VideoApiService();
