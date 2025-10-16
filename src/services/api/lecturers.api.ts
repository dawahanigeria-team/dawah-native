/**
 * Lecturers API Service
 * Handles fetching lecturers/resource persons data
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';

export interface Lecturer {
  // Actual API response fields based on the response
  id: number | string;
  name: string;
  img: string;
  status?: number;
  lang_id?: number;
  favorites?: number;
  share?: number;
  views?: number;
  rp_thumbnail?: string;
  comment?: number;
  charts?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };

  // Computed/additional fields
  language?: string;
  total_lectures?: number;
  followers?: number;
  verified?: boolean;
  bio?: string;
}

export interface LecturersParams {
  page?: number;
  offset?: number;
  lim?: number;
  language?: string;
}

export interface LecturersResponse {
  success: boolean;
  data: Lecturer[];
  page: number;
  total: number;
  total_pages: number;
  per_page: number;
}

class LecturersApiService {
  /**
   * Helper to get language name from lang_id
   */
  private getLanguageFromId(langId?: number): string {
    const languageMap: Record<number, string> = {
      1: 'English',
      2: 'Arabic',
      3: 'French',
      4: 'Swahili',
      5: 'Igbo',
      6: 'Fulani',
      7: 'Yoruba',
      8: 'Hausa',
    };
    return langId ? languageMap[langId] || 'Unknown' : 'Unknown';
  }

  /**
   * Fetch all lecturers
   */
  async getAllLecturers(
    params: LecturersParams = {}
  ): Promise<LecturersResponse> {
    try {
      const page = params.page || 1;
      const lim = params.lim || 10;

      // Calculate offset if not provided
      const offset = params.offset !== undefined
        ? params.offset
        : (page - 1) * lim;

      const requestParams: Record<string, any> = {
        page,
        lim,
        offset,
      };

      // Add language filter if provided
      if (params.language) {
        requestParams.language = params.language;
      }

      // Log the API call
      console.log('👨‍🏫 Lecturers API Call:', {
        endpoint: '/api/all_rps_api.php',
        params: requestParams,
        fullUrl: `${API_CONFIG.BASE_URL}/api/all_rps_api.php?${new URLSearchParams(requestParams).toString()}`
      });

      // Make API request
      const response = await apiClient.get<any>(
        '/api/all_rps_api.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600, // Cache for 10 minutes
        }
      );

      // Log response summary (without sensitive data)
      console.log('📥 Lecturers Response:', {
        status: 'success',
        dataReceived: response.data ? 'Yes' : 'No',
        dataLength: Array.isArray(response.data) ? response.data.length :
                   (response.data?.data ? response.data.data.length : 0),
      });

      // Normalize the response
      return this.normalizeResponse(response.data, params);
    } catch (error) {
      console.error('❌ Lecturers API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch lecturers', undefined, error);
    }
  }

  /**
   * Normalize API response
   */
  private normalizeResponse(
    data: any,
    params: LecturersParams
  ): LecturersResponse {
    // Handle different API response formats
    if (data && data.success === false) {
      throw new ApiError(data.message || 'Failed to fetch lecturers', data.statusCode);
    }

    // The API might return an array directly or wrapped in data
    let lecturers = [];
    if (Array.isArray(data)) {
      lecturers = data;
    } else if (data?.data) {
      lecturers = data.data;
    } else if (data?.results) {
      lecturers = data.results;
    } else if (data?.items) {
      lecturers = data.items;
    } else if (data?.lecturers) {
      lecturers = data.lecturers;
    }

    // Add computed language field to each lecturer
    const enhancedLecturers = lecturers.map((lecturer: any) => ({
      ...lecturer,
      language: this.getLanguageFromId(lecturer.lang_id),
      followers: lecturer.views || 0, // Use views as followers for now
    }));

    return {
      success: true,
      data: enhancedLecturers,
      page: params.page || 1,
      total: data?.total || enhancedLecturers.length,
      total_pages: data?.total_pages || Math.ceil((data?.total || enhancedLecturers.length) / (params.lim || 10)),
      per_page: params.lim || 10,
    };
  }

  /**
   * Get lecturers for homepage slider
   */
  async getLecturersForSlider(limit = 12): Promise<Lecturer[]> {
    try {
      const response = await this.getAllLecturers({
        page: 1,
        lim: limit,
        offset: 0,  // Start from the beginning for the slider
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lecturers for slider:', error);
      return [];
    }
  }

  /**
   * Get lecturer details
   */
  async getLecturerDetails(lecturerId: string | number): Promise<Lecturer | null> {
    try {
      // This would typically be a separate API endpoint
      // For now, we'll fetch all and find the specific one
      const response = await this.getAllLecturers({ lim: 50 });
      const lecturer = response.data.find(l =>
        String(l.id) === String(lecturerId)
      );
      return lecturer || null;
    } catch (error) {
      console.error('Failed to fetch lecturer details:', error);
      return null;
    }
  }
}

// Export singleton instance
export const lecturersApi = new LecturersApiService();