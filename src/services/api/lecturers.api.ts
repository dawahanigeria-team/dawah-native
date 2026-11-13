/**
 * Lecturers API Service
 * Handles fetching lecturers/resource persons data
 */

import { getLanguageId, getLanguageName } from '../../utils/languages';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { logger } from '@/utils/logger';

export interface Lecturer {
  // Actual API response fields based on the response
  id: number | string;
  nid?: number | string;
  name: string;
  img: string;
  status?: number;
  lang_id?: number;
  favorites?: number;
  share?: number;
  views?: number;
  rp_thumbnail?: string;
  /**
   * 400x240 derivative of the scholar's artwork, ~17KB, generated from the same
   * source as `img` (which is a full-size original of up to 820KB drawn into a
   * card a few hundred pixels wide). Uncropped, because the artwork is a wide
   * branded name card and a square crop cuts the scholar's name in half.
   */
  rp_avatar?: string;
  comment?: number;
  charts?: {
    daily?: number;
    weekly?: number;
    monthly?: number;
  };

  // Computed/additional fields
  language?: string;
  total_lectures?: number;
  total_audio?: number;
  total_albums?: number;
  total_playlist?: number;
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
  rpid?: string | number;
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
        // Ask for the paginated envelope so `total` is the real number of
        // scholars in the catalogue rather than the number of rows on this page.
        // It has to travel in the body: responses are cached by body alone, so a
        // total read from the X-Total-Count header would vanish on a cache hit
        // and the screen would fall back to showing the loaded count.
        meta: 1,
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

      if (params.rpid !== undefined && String(params.rpid).trim() !== '') {
        requestParams.rpid = params.rpid;
      }

      // Log the API call
      logger.debug('Lecturers API Call:', {
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
      logger.debug('Lecturers Response:', {
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

    // `total` is the catalogue size, not the page size. Falling back to the page
    // length is only correct for an upstream that sends no total at all (an old
    // build talking to an old API); when that happens the caller sees
    // total === data.length and simply cannot show a "showing X of Y" count.
    const perPage = params.lim || 10;
    const total =
      typeof data?.total === 'number' ? data.total : enhancedLecturers.length;

    return {
      success: true,
      data: enhancedLecturers,
      page: params.page || 1,
      total,
      total_pages: data?.total_pages || Math.ceil(total / perPage),
      per_page: perPage,
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
   * Uses the exact lecturer lookup so this request never collides with the
   * lecture-list request made by the lecturer screen.
   */
  async getLecturerDetails(lecturerId: string | number): Promise<Lecturer | null> {
    logger.debug('Fetching lecturer directly by id:', lecturerId);
    const response = await apiClient.get<Lecturer[]>(
      '/api/rplisting_multi_nid_api.php',
      { id: lecturerId },
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: true,
        cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
      },
    );

    const lecturer = Array.isArray(response.data) ? response.data[0] : null;
    if (!lecturer) return null;
    return {
      ...lecturer,
      id: lecturer.id ?? lecturer.nid ?? lecturerId,
      language: this.resolveLanguage(lecturer),
      followers: lecturer.views || 0,
    };
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
      logger.debug('Fetching lectures for lecturer:', lecturerId);

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

      // A non-array means the upstream answered with something we cannot read —
      // an error envelope, or null. Coercing that to [] is what made a failed
      // request indistinguishable from "this scholar has no lectures", so throw
      // and let the caller tell the two apart. Drop the cached copy first:
      // cache writes are not gated on `useCache`, so the unreadable body is
      // already stored and every retry inside the TTL would replay it.
      if (!Array.isArray(response.data)) {
        await apiClient.clearCache(
          `leclisting_rp.php?page=${page}&rpid=${lecturerId}`
        );
        throw new ApiError(
          'Lectures response was not a list',
          undefined,
          response.data
        );
      }
      const lectures = response.data;

      logger.debug('Lectures fetched:', lectures.length);

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
  updated_date?: string;
}

// Export singleton instance
export const lecturersApi = new LecturersApiService();
