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
   * Language IDs from /all_lang_api.php
   */
  private getLanguageFromId(langId?: number): string {
    const languageMap: Record<number, string> = {
      157: 'Arabic',
      877: 'Ebira',
      6: 'English',
      8: 'Hausa',
      50041: 'Igala',
      9: 'Igbo',
      53181: 'Nupe',
      46504: 'Pidgin English',
      7: 'Yoruba',
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

  /**
   * Get lectures by lecturer
   */
  async getLecturesByLecturer(
    lecturerId: string | number,
    page = 1
  ): Promise<{
    data: LecturerLecture[];
    total: number;
    page: number;
    total_pages: number;
  }> {
    try {
      console.log('📚 Fetching lectures for lecturer:', lecturerId);

      const response = await apiClient.get<any>(
        '/api/leclisting_rp.php',
        {
          page,
          rpid: lecturerId,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
        }
      );

      // Response is an array of lectures
      const lectures = Array.isArray(response.data) ? response.data : [];

      console.log('✅ Lectures fetched:', lectures.length);

      return {
        data: lectures,
        total: lectures.length,
        page,
        total_pages: 1, // API doesn't provide pagination info
      };
    } catch (error) {
      console.error('❌ Failed to fetch lectures by lecturer:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch lectures', undefined, error);
    }
  }
}

// Lecture by lecturer interface
export interface LecturerLecture {
  title: string;
  audio: string;
  img: string;
  nid: number;
  duration: string;
  description?: string;
  lang: string;
  cats: string;
  downloads: number;
  views: number;
  favorites: number;
  share: number;
  comment: number;
  rp_id: number;
  rpname: string;
  rp_image: string;
  is_reciter: boolean;
}

// Export singleton instance
export const lecturersApi = new LecturersApiService();