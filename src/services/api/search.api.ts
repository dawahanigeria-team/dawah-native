/**
 * Search API Service
 * Handles all search-related API calls with optimized caching and performance
 */

import { getLanguageId } from '../../utils/languages';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import {
  SearchType,
  SearchResponse,
  QuickSearchResponse,
  SearchLecture,
  SearchLecturer,
  SearchAlbum,
  SearchPlaylist,
} from '../../types/api.types';

export interface SearchParams {
  type: SearchType;
  query: string;
  page?: number;
  limit?: number;
  quick?: boolean;
  language?: string;
  category?: string;
  sortBy?: 'relevance' | 'date' | 'popularity';
  field?: string;
  lecturer_nid?: string;
  signal?: AbortSignal;
}

class SearchApiService {
  private recentSearches: string[] = [];
  private readonly MAX_RECENT_SEARCHES = 10;

  /**
   * Validate search query
   */
  private validateQuery(query: string): void {
    if (!query || query.trim().length < 2) {
      throw new ApiError('Search query must be at least 2 characters long', 400);
    }

    if (query.length > 100) {
      throw new ApiError('Search query is too long (max 100 characters)', 400);
    }
  }

  /**
   * Sanitize search query
   */
  private sanitizeQuery(query: string): string {
    // Remove extra whitespaces and trim
    let sanitized = query.trim().replace(/\s+/g, ' ');

    // Remove potentially harmful characters (basic XSS prevention)
    sanitized = sanitized.replace(/[<>]/g, '');

    return sanitized;
  }

  /**
   * Main search method
   */
  async search<T = any>(params: SearchParams): Promise<SearchResponse<T>> {
    try {
      // Validate and sanitize query
      this.validateQuery(params.query);
      const sanitizedQuery = this.sanitizeQuery(params.query);

      // Build request parameters
      const requestParams: Record<string, any> = {
        type: params.type,
        value: sanitizedQuery,
        page: params.page || 1,
        limit: params.limit || 50, // Default to 50 items per page
      };

      // Add optional parameters
      if (params.quick) {
        requestParams.quick = true;
        requestParams.limit = 10; // Quick search always returns max 10 items
      }

      if (params.language && params.language !== 'All') {
        const langId = getLanguageId(params.language);
        requestParams.language = langId || params.language;
      }

      if (params.category) {
        requestParams.category = params.category;
      }

      if (params.lecturer_nid) {
        requestParams.lecturer_nid = params.lecturer_nid;
      }

      if (params.field) {
        requestParams.field = params.field;
      }

      if (params.sortBy) {
        requestParams.sort = params.sortBy;
      }

      // Log the API call details
      console.log('🔍 Search API Call:', {
        endpoint: API_CONFIG.ENDPOINTS.SEARCH,
        baseUrl: API_CONFIG.BASE_URL,
        params: requestParams,
        fullUrl: `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SEARCH}?${new URLSearchParams(requestParams).toString()}`
      });

      // Make API request with shorter timeout for quick search
      const response = await apiClient.get<SearchResponse<T>>(
        API_CONFIG.ENDPOINTS.SEARCH,
        requestParams,
        {
          timeout: params.quick ? 5000 : API_CONFIG.TIMEOUTS.SEARCH,
          useCache: true,
          cacheTTL: params.quick ? 60 : API_CONFIG.CACHE.SEARCH_TTL,
          signal: params.signal,
        }
      );

      // Log response summary (without sensitive data)
      console.log('📥 Search API Response:', {
        status: 'success',
        dataReceived: response.data ? 'Yes' : 'No',
        dataLength: Array.isArray(response.data) ? response.data.length :
                   (response.data?.data ? response.data.data.length : 0),
      });

      // Track recent searches (not for quick searches)
      if (!params.quick) {
        this.addToRecentSearches(sanitizedQuery);
      }

      // Process and normalize the response
      const normalizedResponse = this.normalizeSearchResponse<T>(response.data, params);

      // Log normalized response summary
      console.log('✅ Normalized Search Response:', {
        success: normalizedResponse.success,
        total: normalizedResponse.total,
        dataLength: normalizedResponse.data.length,
      });

      return normalizedResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Search failed', undefined, error);
    }
  }

  /**
   * Quick search for typeahead/autocomplete
   */
  async quickSearch(query: string, type: SearchType = 'all'): Promise<QuickSearchResponse> {
    try {
      const response = await this.search({
        type,
        query,
        quick: true,
      });

      // Transform to quick search format
      return {
        success: true,
        results: this.transformToQuickResults(response),
      };
    } catch {
      // Return empty results on error for better UX
      return {
        success: false,
        results: [],
      };
    }
  }

  /**
   * Search lectures
   */
  async searchLectures(
    query: string,
    page = 1,
    filters?: {
      language?: string;
      category?: string;
      sortBy?: 'relevance' | 'date' | 'popularity';
      lecturer_nid?: string;
    }
  ): Promise<SearchResponse<SearchLecture>> {
    return this.search<SearchLecture>({
      type: 'lectures',
      query,
      page,
      ...filters,
    });
  }

  /**
   * Search lecturers
   */
  async searchLecturers(
    query: string,
    page = 1,
    language?: string
  ): Promise<SearchResponse<SearchLecturer>> {
    return this.search<SearchLecturer>({
      type: 'lecturers',
      query,
      page,
      language,
    });
  }

  /**
   * Search albums
   */
  async searchAlbums(
    query: string,
    page = 1,
    language?: string
  ): Promise<SearchResponse<SearchAlbum>> {
    return this.search<SearchAlbum>({
      type: 'albums',
      query,
      page,
      language,
    });
  }

  /**
   * Search playlists
   */
  async searchPlaylists(
    query: string,
    page = 1
  ): Promise<SearchResponse<SearchPlaylist>> {
    return this.search<SearchPlaylist>({
      type: 'playlists',
      query,
      page,
    });
  }

  /**
   * Search all content types
   */
  async searchAll(
    query: string,
    page = 1
  ): Promise<{
    lectures: SearchLecture[];
    lecturers: SearchLecturer[];
    albums: SearchAlbum[];
    playlists: SearchPlaylist[];
    total: number;
  }> {
    try {
      // Parallel search across all types for better performance
      const [lectures, lecturers, albums, playlists] = await Promise.allSettled([
        this.searchLectures(query, page),
        this.searchLecturers(query, page),
        this.searchAlbums(query, page),
        this.searchPlaylists(query, page),
      ]);

      const results = {
        lectures: lectures.status === 'fulfilled' ? lectures.value.data : [],
        lecturers: lecturers.status === 'fulfilled' ? lecturers.value.data : [],
        albums: albums.status === 'fulfilled' ? albums.value.data : [],
        playlists: playlists.status === 'fulfilled' ? playlists.value.data : [],
        total: 0,
      };

      // Calculate total
      results.total =
        results.lectures.length +
        results.lecturers.length +
        results.albums.length +
        results.playlists.length;

      return results;
    } catch (error) {
      throw new ApiError('Failed to search all content types', undefined, error);
    }
  }

  /**
   * Get recent searches
   */
  getRecentSearches(): string[] {
    return [...this.recentSearches];
  }

  /**
   * Clear recent searches
   */
  clearRecentSearches(): void {
    this.recentSearches = [];
  }

  /**
   * Add to recent searches
   */
  private addToRecentSearches(query: string): void {
    // Remove if already exists
    const index = this.recentSearches.indexOf(query);
    if (index > -1) {
      this.recentSearches.splice(index, 1);
    }

    // Add to beginning
    this.recentSearches.unshift(query);

    // Keep only MAX_RECENT_SEARCHES items
    if (this.recentSearches.length > this.MAX_RECENT_SEARCHES) {
      this.recentSearches = this.recentSearches.slice(0, this.MAX_RECENT_SEARCHES);
    }
  }

  /**
   * Normalize search response
   */
  private normalizeSearchResponse<T>(
    data: any,
    params: SearchParams
  ): SearchResponse<T> {
    // Handle different API response formats
    if (data.success === false) {
      throw new ApiError(data.message || 'Search failed', data.statusCode);
    }

    return {
      success: true,
      type: params.type,
      query: params.query,
      page: data.page || params.page || 1,
      total: data.total || data.data?.length || 0,
      total_pages: data.total_pages || Math.ceil((data.total || 0) / (params.limit || 20)),
      per_page: params.limit || 20,
      data: data.data || data.results || data.items || [],
      filters: {
        language: params.language,
        category: params.category,
      },
    };
  }

  /**
   * Transform to quick search results
   */
  private transformToQuickResults(response: SearchResponse<any>): any[] {
    return response.data.slice(0, 10).map((item: any) => {
      // Determine item type and format accordingly
      let title = '';
      let subtitle = '';
      let imageUrl = '';

      switch (response.type) {
        case 'lectures':
          title = item.mp3_title || item.Title || item.title;
          subtitle = item.lecturer_name || item.ResourcePerson || item.lecturer;
          imageUrl = item.lecturer_image || item.CoverUrl || item.coverUrl;
          break;

        case 'lecturers':
          title = item.name;
          subtitle = `${item.totalLectures || 0} lectures`;
          imageUrl = item.avatarUrl;
          break;

        case 'albums':
          title = item.title;
          subtitle = item.lecturerName || item.lecturer;
          imageUrl = item.coverUrl;
          break;

        case 'playlists':
          title = item.title;
          subtitle = `${item.itemCount || 0} items`;
          imageUrl = item.coverUrl;
          break;

        default:
          title = item.mp3_title || item.title || item.name || item.Title;
          subtitle = item.subtitle || '';
          imageUrl = item.lecturer_image || item.imageUrl || item.coverUrl || item.CoverUrl;
      }

      return {
        type: response.type,
        id: item.id || item.nid,
        title,
        subtitle,
        imageUrl,
      };
    });
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    try {
      // First check recent searches for matches
      const recentMatches = this.recentSearches
        .filter(search =>
          search.toLowerCase().includes(partialQuery.toLowerCase())
        )
        .slice(0, 5);

      // If we have enough recent matches, return them
      if (recentMatches.length >= 3) {
        return recentMatches;
      }

      // Otherwise, fetch from API
      const response = await this.quickSearch(partialQuery);
      const apiSuggestions = response.results
        .map(r => r.title)
        .filter(title => !recentMatches.includes(title))
        .slice(0, 5 - recentMatches.length);

      return [...recentMatches, ...apiSuggestions];
    } catch {
      // Return recent searches as fallback
      return this.recentSearches.slice(0, 5);
    }
  }
}

// Export singleton instance
export const searchApi = new SearchApiService();
