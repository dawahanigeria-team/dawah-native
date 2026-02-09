/**
 * Popular Lectures API Service
 * Handles fetching popular lectures data
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { SearchLecture } from '../../types/api.types';
import { logger } from '@/utils/logger';

export interface PopularLecturesParams {
  page?: number;
  langid?: number;
  limit?: number;
}

export interface PopularLecturesResponse {
  success: boolean;
  data: SearchLecture[];
  page: number;
  total: number;
  total_pages: number;
  per_page: number;
}

class PopularLecturesApiService {
  /**
   * Fetch popular lectures
   */
  async getPopularLectures(
    params: PopularLecturesParams = {}
  ): Promise<PopularLecturesResponse> {
    try {
      const requestParams: Record<string, any> = {
        page: params.page || 1,
      };

      // Add language ID if provided
      if (params.langid) {
        requestParams.langid = params.langid;
      }

      // Add limit if provided
      if (params.limit) {
        requestParams.limit = params.limit;
      }

      // Log the API call
      logger.debug('Popular Lectures API Call:', {
        endpoint: '/api/popular_lec_api.php',
        params: requestParams,
        fullUrl: `${API_CONFIG.BASE_URL}/api/popular_lec_api.php?${new URLSearchParams(requestParams).toString()}`
      });

      // Make API request
      const response = await apiClient.get<any>(
        '/api/popular_lec_api.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 300, // Cache for 5 minutes
        }
      );

      // Log response summary (without sensitive data)
      logger.debug('Popular Lectures Response:', {
        status: 'success',
        dataReceived: response.data ? 'Yes' : 'No',
        dataLength: Array.isArray(response.data) ? response.data.length :
                   (response.data?.data ? response.data.data.length : 0),
      });

      // Normalize the response
      return this.normalizeResponse(response.data, params);
    } catch (error) {
      console.error('❌ Popular Lectures API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch popular lectures', undefined, error);
    }
  }

  /**
   * Normalize API response
   */
  private normalizeResponse(
    data: any,
    params: PopularLecturesParams
  ): PopularLecturesResponse {
    // Handle different API response formats
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch popular lectures', data.statusCode);
    }

    // The API returns an array directly for popular lectures
    let lectures = [];
    if (Array.isArray(data)) {
      lectures = data;
    } else if (data?.data) {
      lectures = data.data;
    } else if (data?.results) {
      lectures = data.results;
    } else if (data?.items) {
      lectures = data.items;
    }

    // Filter out Quran recitations (keyword: "dn_quran")
    const filteredLectures = lectures.filter((lecture: any) => {
      return lecture.keyword !== 'dn_quran';
    });

    logger.debug(`Filtered popular lectures: ${lectures.length} total, ${filteredLectures.length} after removing Quran recitations`);

    return {
      success: true,
      data: filteredLectures,
      page: params.page || 1,
      total: filteredLectures.length,
      total_pages: 1, // Popular lectures might not have pagination
      per_page: filteredLectures.length,
    };
  }

  /**
   * Get popular lectures for carousel/slider
   */
  async getPopularForCarousel(limit = 10): Promise<SearchLecture[]> {
    try {
      const response = await this.getPopularLectures({
        page: 1,
        limit,
      });
      return response.data.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch popular lectures for carousel:', error);
      return [];
    }
  }
}

// Export singleton instance
export const popularApi = new PopularLecturesApiService();