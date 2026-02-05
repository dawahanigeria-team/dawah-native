/**
 * Lecturers API Service
 * Handles fetching lecturers/resource persons data
 */

import { getLanguageId, getLanguageName } from '../../utils/languages';
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
  language?: string | number; // Can be language ID (number) or name (string)
  state?: string;
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
    return getLanguageName(langId);
  }

  private resolveLanguage(lecturer: any): string {
    return (
      lecturer.language ||
      lecturer.lang ||
      lecturer.language_name ||
      this.getLanguageFromId(lecturer.lang_id) ||
      'Unknown'
    );
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

      // Add language filter if provided (API expects 'langid' parameter)
      if (params.language) {
        if (typeof params.language === 'string' && params.language !== 'All') {
          const langId = getLanguageId(params.language);
          requestParams.langid = langId || params.language;
        } else if (typeof params.language === 'number') {
          requestParams.langid = params.language;
        }
      }

      if (params.state && params.state !== 'All') {
        requestParams.state = params.state;
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
      if (error instanceof ApiError && error.isCancelled) {
        throw error;
      }
      console.error('❌ Lecturers API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch lecturers', undefined, error);
    }
  }

  /**
   * Fetch available states for filtering
   */
  async getStates(): Promise<string[]> {
    try {
      const response = await apiClient.get<any>(
        '/api/all_states_api.php',
        {},
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 60 * 60 * 24, // Cache for 24 hours
        }
      );

      const data = response.data;
      const rawStates = Array.isArray(data?.states)
        ? data.states
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data?.states)
            ? data.data.states
            : [];

      return rawStates
        .map((state: any) => String(state || '').trim())
        .filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch states:', error);
      return [];
    }
  }

  /**
   * Search lecturers by name
   */
  async searchLecturers(value: string, state?: string): Promise<Lecturer[]> {
    try {
      const requestParams: Record<string, any> = {
        type: 'lecturers',
        value,
      };

      if (state && state !== 'All') {
        requestParams.state = state;
      }

      const response = await apiClient.get<any>(
        '/api/searchApi.php',
        requestParams,
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: false,
        }
      );

      const data = response.data;
      if (data && data.success === false) {
        throw new ApiError(data.message || 'Failed to search lecturers', data.statusCode);
      }

      let lecturers: any[] = [];
      if (Array.isArray(data)) {
        lecturers = data;
      } else if (Array.isArray(data?.data)) {
        lecturers = data.data;
      } else if (Array.isArray(data?.results)) {
        lecturers = data.results;
      } else if (Array.isArray(data?.items)) {
        lecturers = data.items;
      } else if (Array.isArray(data?.lecturers)) {
        lecturers = data.lecturers;
      }

      return lecturers.map((lecturer: any) => ({
        ...lecturer,
        language: this.resolveLanguage(lecturer),
        followers: lecturer.views || 0,
      }));
    } catch (error) {
      console.error('Failed to search lecturers:', error);
      throw error;
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
      language: this.resolveLanguage(lecturer),
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
   * Tries to find lecturer in all lecturers list first,
   * falls back to extracting info from their lectures if not found
   */
  async getLecturerDetails(lecturerId: string | number): Promise<Lecturer | null> {
    try {
      console.log('👤 Fetching lecturer details for:', lecturerId);

      // Try to find in all lecturers list first
      const response = await this.getAllLecturers({ lim: 50 });
      const lecturer = response.data.find(l =>
        String(l.id) === String(lecturerId)
      );

      if (lecturer) {
        console.log('✅ Lecturer found in list:', lecturer.name);
        return lecturer;
      }

      // Lecturer not in first 50, fetch their lectures to get info
      console.log('⚠️ Lecturer not in list, fetching from lectures...');
      const lecturesResponse = await this.getLecturesByLecturer(lecturerId, 1);

      if (lecturesResponse.data.length > 0) {
        const firstLecture = lecturesResponse.data[0];
        const constructedLecturer: Lecturer = {
          id: lecturerId,
          name: firstLecture.rpname || 'Unknown Lecturer',
          img: firstLecture.rp_image || '',
          language: firstLecture.lang || 'Unknown',
          views: firstLecture.views || 0,
          favorites: firstLecture.favorites || 0,
          share: firstLecture.share || 0,
          comment: firstLecture.comment || 0,
        };
        console.log('✅ Lecturer constructed from lectures:', constructedLecturer.name);
        return constructedLecturer;
      }

      console.log('❌ No lectures found for lecturer:', lecturerId);
      return null;
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
