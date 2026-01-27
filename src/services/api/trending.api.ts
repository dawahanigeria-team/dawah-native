/**
 * Trending Lectures API Service
 * Handles fetching trending lectures data (popular lectures with langid=6)
 */

import { SearchLecture } from '../../types/api.types';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';

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
  // Cache for all trending lectures (client-side pagination)
  private allTrendingCache: SearchLecture[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 300000; // 5 minutes in milliseconds
  private cachedLimit: number = 0; // Track the limit used for caching

  async getTrendingLectures(
    params: TrendingLecturesParams = {}
  ): Promise<TrendingLecturesResponse> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 20;

      // Check if we need to fetch fresh data
      const now = Date.now();
      const cacheExpired = now - this.cacheTimestamp > this.CACHE_DURATION;
      const requestLimit = 100; // Match the actual API request limit
      const configChanged = this.cachedLimit !== requestLimit;

      if (!this.allTrendingCache || cacheExpired || configChanged) {
        if (configChanged) {
          console.log('🔄 Cache invalidated due to limit change:', this.cachedLimit, '→', requestLimit);
        }
        
        // Randomize langid to get varied trending content from different languages
        // 6: English, 8: Hausa, 7: Yoruba
        const langIds = [6, 7, 8];
        const randomLangId = langIds[Math.floor(Math.random() * langIds.length)];

        // Fetch all trending lectures at once (API doesn't support pagination)
        // Request a large limit to get all available items
        const requestParams: Record<string, any> = {
          langid: randomLangId,
          lim: 100, // Request up to 100 items (reduced from 1000 for 3G optimization)
        };

        // Log the API call
        console.log(`🔥 Trending Lectures API Call (fetching for langid ${randomLangId} with limit 100):`, {
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
            useCache: false, // Don't use HTTP cache, we'll handle caching ourselves
            headers: {
              'Origin': API_CONFIG.ORIGIN,
              'Referer': API_CONFIG.REFERER,
              'User-Agent': API_CONFIG.USER_AGENT,
              'X-Project-Key': API_CONFIG.X_PROJECT_KEY,
            },
          }
        );

        // Log response summary
        console.log('📥 Trending Lectures Response:', {
          status: 'success',
          dataReceived: response.data ? 'Yes' : 'No',
          dataLength: Array.isArray(response.data) ? response.data.length :
                     (response.data?.data ? response.data.data.length : 0),
        });

        // Extract and filter lectures
        let lectures = [];
        if (Array.isArray(response.data)) {
          lectures = response.data;
        } else if (response.data?.data) {
          lectures = response.data.data;
        } else if (response.data?.results) {
          lectures = response.data.results;
        } else if (response.data?.items) {
          lectures = response.data.items;
        }

        // Filter out Quran recitations
        const filteredLectures = lectures.filter((lecture: any) => {
          return lecture.keyword !== 'dn_quran';
        });

        console.log(`📊 Cached ${filteredLectures.length} trending lectures for client-side pagination`);

        // Store in cache
        this.allTrendingCache = filteredLectures;
        this.cacheTimestamp = now;
        this.cachedLimit = requestLimit;
      }

      // Perform client-side pagination
      if (!this.allTrendingCache) {
        throw new ApiError('Failed to load trending lectures from cache', 500);
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = this.allTrendingCache.slice(startIndex, endIndex);
      const totalItems = this.allTrendingCache.length;
      const totalPages = Math.ceil(totalItems / limit);

      console.log(`📄 Client-side pagination: Page ${page}/${totalPages}, showing items ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}, hasMore: ${page < totalPages}`);

      return {
        success: true,
        data: paginatedData,
        page: page,
        total: totalItems,
        total_pages: totalPages,
        per_page: limit,
      };
    } catch (error) {
      console.error('❌ Trending Lectures API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch trending lectures', undefined, error);
    }
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

  /**
   * Clear the trending lectures cache (useful for pull-to-refresh)
   */
  clearCache(): void {
    this.allTrendingCache = null;
    this.cacheTimestamp = 0;
    this.cachedLimit = 0;
    console.log('🗑️ Trending lectures cache cleared');
  }
}

// Export singleton instance
export const trendingApi = new TrendingLecturesApiService();
