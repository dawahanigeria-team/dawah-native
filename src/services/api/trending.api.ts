/**
 * Trending Lectures API Service
 * Handles fetching trending lectures data (popular lectures with langid=6)
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { SearchLecture } from '../../types/api.types';

export interface TrendingLecturesParams {
  page?: number;
  limit?: number;
}

export interface TrendingLecturesResponse {
  success: boolean;
  data: SearchLecture[];
  page: number;
  total: number;
  total_pages: number;
  per_page: number;
}

class TrendingLecturesApiService {
  /**
   * Fetch trending lectures (popular lectures with langid=6)
   */
  async getTrendingLectures(
    params: TrendingLecturesParams = {}
  ): Promise<TrendingLecturesResponse> {
    try {
      const requestParams: Record<string, any> = {
        page: params.page || 1,
        langid: 6, // Trending content uses langid=6
      };

      // Add limit if provided
      if (params.limit) {
        requestParams.limit = params.limit;
      }

      // Log the API call
      console.log('🔥 Trending Lectures API Call:', {
        endpoint: '/api/popular_lec_api.php',
        params: requestParams,
        fullUrl: `${API_CONFIG.BASE_URL}/api/popular_lec_api.php?${new URLSearchParams(requestParams).toString()}`
      });

      // Make API request with proper headers
      const response = await apiClient.get<any>(
        '/api/popular_lec_api.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 300, // Cache for 5 minutes
          headers: {
            'Origin': API_CONFIG.ORIGIN,
            'Referer': API_CONFIG.REFERER,
            'User-Agent': API_CONFIG.USER_AGENT,
            'X-Project-Key': API_CONFIG.X_PROJECT_KEY,
          },
        }
      );

      // Log the raw response
      console.log('📥 Trending Lectures Response:', {
        status: 'success',
        dataReceived: response.data ? 'Yes' : 'No',
        dataType: typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length :
                   (response.data?.data ? response.data.data.length : 0),
        rawData: response.data
      });

      // Log first item structure
      if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log('📋 First Trending Lecture Structure:', {
          firstItem: response.data.data[0],
          keys: Object.keys(response.data.data[0])
        });
      }

      // Normalize the response
      return this.normalizeResponse(response.data, params);
    } catch (error) {
      console.error('❌ Trending Lectures API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch trending lectures', undefined, error);
    }
  }

  /**
   * Normalize API response
   */
  private normalizeResponse(
    data: any,
    params: TrendingLecturesParams
  ): TrendingLecturesResponse {
    // Handle different API response formats
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch trending lectures', data.statusCode);
    }

    // The API returns an array directly for trending lectures
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

    console.log(`📊 Filtered trending lectures: ${lectures.length} total, ${filteredLectures.length} after removing Quran recitations`);

    return {
      success: true,
      data: filteredLectures,
      page: params.page || 1,
      total: filteredLectures.length,
      total_pages: 1, // Trending lectures might not have pagination
      per_page: filteredLectures.length,
    };
  }

  /**
   * Get trending lectures for carousel/slider
   */
  async getTrendingForCarousel(limit = 10): Promise<SearchLecture[]> {
    try {
      const response = await this.getTrendingLectures({
        page: 1,
        limit,
      });
      return response.data.slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch trending lectures for carousel:', error);
      return [];
    }
  }
}

// Export singleton instance
export const trendingApi = new TrendingLecturesApiService();
