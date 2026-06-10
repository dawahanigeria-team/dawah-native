/**
 * Ramadan Tafsir API Service
 * Handles fetching Ramadan Tafsir albums and lectures
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';

export interface RamadanAlbum {
  id: string;
  name: string;
  img: string;
  alb_thumbnail: string;
  lec_no: number;
  language: string;
  views: number;
  downloads: number;
  categories: string;
  post_date: string;
  year: number;
  key_id: string;
  charts: {
    daily: number;
    monthly: number;
    weekly: number;
  };
}

export interface RamadanAlbumsParams {
  page?: number;
  limit?: number;
}

export interface RamadanAlbumsResponse {
  albums: RamadanAlbum[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface RamadanYearGroup {
  year: number;
  name: string;
  totalCount: number;
  albums: RamadanAlbum[];
}

export interface RamadanAlbumsGroupedResponse {
  yearGroups: RamadanYearGroup[];
  totalAlbums: number;
}

export interface RamadanRecitation {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
  trackNumber?: number;
  plays?: number;
}

export interface RamadanAlbumDetail {
  album: RamadanAlbum;
  recitations: RamadanRecitation[];
}

interface RamadanApiDocument {
  id: number;
  name: string;
  img: string;
  alb_thumbnail: string;
  lec_no: number;
  language: string;
  views: number;
  downloads: number;
  categories: string;
  post_date: string;
  key_id: string;
  charts: {
    daily: number;
    monthly: number;
    weekly: number;
  };
}

interface RamadanKeywordAlbum {
  nid: number;
  title: string;
  img: string;
  alb_thumbnail: string;
  lec_no: number;
  lang: string;
  categories: string;
  key_id: string;
  keyword: string;
  comment: string;
}

interface RamadanApiYearGroup {
  key_id: string;
  name: string;
  year: number;
  total_count: number;
  documents: RamadanApiDocument[];
}

interface RamadanApiResponse {
  data: RamadanApiYearGroup[];
  success: boolean;
  total_count: number;
}

class RamadanApiService {
  /**
   * Fetch Ramadan Tafsir albums
   */
  async getRamadanAlbums(params: RamadanAlbumsParams = {}): Promise<RamadanAlbumsResponse> {
    const { page = 1, limit = 20 } = params;

    try {
      const response = await apiClient.get<RamadanApiResponse>(
        '/api/ramadanlisting_api.php',
        {
          action: 'getRamadanAlbums',
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600, // Cache for 10 minutes
        }
      );

      // Flatten all documents from all year groups into a single array
      const allAlbums: RamadanAlbum[] = [];
      // apiClient.get returns ApiResponse<T> which wraps the data
      // response.data is RamadanApiResponse, response.data.data is the year groups array
      const apiData = response.data;
      const yearGroups = apiData?.data || [];

      if (!Array.isArray(yearGroups)) {
        console.warn('Ramadan API: yearGroups is not an array', { yearGroups, apiData });
        return {
          albums: [],
          total: 0,
          page,
          hasMore: false,
        };
      }

      yearGroups.forEach((yearGroup: RamadanApiYearGroup) => {
        const year = yearGroup.year || 0;
        const documents = yearGroup.documents || [];

        documents.forEach((doc: RamadanApiDocument) => {
          allAlbums.push({
            id: String(doc.id),
            name: doc.name || 'Unknown',
            img: doc.img || '',
            alb_thumbnail: doc.alb_thumbnail || doc.img || '',
            lec_no: doc.lec_no || 0,
            language: doc.language || 'Hausa',
            views: doc.views || 0,
            downloads: doc.downloads || 0,
            categories: doc.categories || 'Quran & Tafsir',
            post_date: doc.post_date || '',
            year,
            key_id: doc.key_id || '',
            charts: doc.charts || { daily: 0, monthly: 0, weekly: 0 },
          });
        });
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedAlbums = allAlbums.slice(startIndex, endIndex);

      return {
        albums: paginatedAlbums,
        total: allAlbums.length,
        page,
        hasMore: endIndex < allAlbums.length,
      };
    } catch (error) {
      console.error('Failed to fetch Ramadan albums:', error);

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Ramadan albums', undefined, error);
    }
  }

  /**
   * Fetch Ramadan Tafsir albums grouped by year (for the main screen)
   */
  async getRamadanAlbumsGrouped(): Promise<RamadanAlbumsGroupedResponse> {
    try {
      const response = await apiClient.get<RamadanApiResponse>(
        '/api/ramadanlisting_api.php',
        {
          action: 'getRamadanAlbums',
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600, // Cache for 10 minutes
        }
      );

      const apiData = response.data;
      const rawYearGroups = apiData?.data || [];

      if (!Array.isArray(rawYearGroups)) {
        console.warn('Ramadan API: yearGroups is not an array', { rawYearGroups, apiData });
        return {
          yearGroups: [],
          totalAlbums: 0,
        };
      }

      let totalAlbums = 0;
      const yearGroups: RamadanYearGroup[] = rawYearGroups.map((yearGroup: RamadanApiYearGroup) => {
        const year = yearGroup.year || 0;
        const documents = yearGroup.documents || [];
        totalAlbums += documents.length;

        const albums: RamadanAlbum[] = documents.map((doc: RamadanApiDocument) => ({
          id: String(doc.id),
          name: doc.name || 'Unknown',
          img: doc.img || '',
          alb_thumbnail: doc.alb_thumbnail || doc.img || '',
          lec_no: doc.lec_no || 0,
          language: doc.language || 'Hausa',
          views: doc.views || 0,
          downloads: doc.downloads || 0,
          categories: doc.categories || 'Quran & Tafsir',
          post_date: doc.post_date || '',
          year,
          key_id: doc.key_id || '',
          charts: doc.charts || { daily: 0, monthly: 0, weekly: 0 },
        }));

        return {
          year,
          name: yearGroup.name || `Ramadan Tafseer ${year}`,
          totalCount: yearGroup.total_count || documents.length,
          albums,
        };
      });

      return {
        yearGroups,
        totalAlbums,
      };
    } catch (error) {
      console.error('Failed to fetch Ramadan albums grouped:', error);

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Ramadan albums', undefined, error);
    }
  }

  /**
   * Get Ramadan albums for a specific year using keywords API
   */
  async getRamadanAlbumsByYear(
    year: number,
    page: number = 1
  ): Promise<RamadanAlbumsResponse & { lectures: number; languages: string[] }> {
    try {
      const keyword = `Ramadan Tafseer ${year}`;
      
      const response = await apiClient.get<{
        data: RamadanKeywordAlbum[];
        total: number;
        success: boolean;
      }>(
        '/api/albumlisting_keywords_api.php',
        {
          key: keyword,
          page,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600,
        }
      );

      const apiData = response.data;
      const rawAlbums = apiData?.data || [];
      const total = apiData?.total || 0;

      // Calculate total lectures and unique languages
      let totalLectures = 0;
      const languagesSet = new Set<string>();

      const albums: RamadanAlbum[] = rawAlbums.map((item: RamadanKeywordAlbum) => {
        totalLectures += item.lec_no || 0;
        if (item.lang) {
          languagesSet.add(item.lang);
        }

        return {
          id: String(item.nid || item.key_id),
          name: item.title || 'Unknown',
          img: item.img || '',
          alb_thumbnail: item.alb_thumbnail || item.img || '',
          lec_no: item.lec_no || 0,
          language: item.lang || 'Hausa',
          views: 0,
          downloads: 0,
          categories: item.categories || 'Quran & Tafsir',
          post_date: '',
          year,
          key_id: item.key_id || '',
          charts: { daily: 0, monthly: 0, weekly: 0 },
        };
      });

      return {
        albums,
        total,
        page,
        hasMore: albums.length > 0 && page * 20 < total,
        lectures: totalLectures,
        languages: Array.from(languagesSet),
      };
    } catch (error) {
      console.error('Failed to fetch Ramadan albums by year:', error);

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Ramadan albums', undefined, error);
    }
  }

  /**
   * Get Ramadan album details with lectures
   */
  async getRamadanAlbumDetails(albumId: string): Promise<RamadanAlbumDetail> {
    try {
      const response = await apiClient.get<unknown>(
        '/api/albumapi3.php',
        {
          aid: albumId,
          page: 1,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600, // Cache for 10 minutes
        }
      );

      // API returns array of lectures directly
      const rawResponse = response as { data?: unknown[] } | unknown[];
      const lecturesArray = Array.isArray(rawResponse)
        ? rawResponse
        : Array.isArray((rawResponse as { data?: unknown[] }).data)
          ? (rawResponse as { data: unknown[] }).data
          : [];

      if (lecturesArray.length === 0) {
        throw new ApiError('No lectures found in album', 404);
      }

      // Extract album info from first lecture
      const firstLecture = lecturesArray[0] as Record<string, unknown>;
      const album: RamadanAlbum = {
        id: albumId,
        name: (firstLecture.album_name as string) || 'Unknown',
        img: (firstLecture.lec_img as string) || (firstLecture.mp3_thumbnail as string) || '',
        alb_thumbnail: (firstLecture.alb_thumbnail as string) || (firstLecture.lec_img as string) || '',
        lec_no: lecturesArray.length,
        language: (firstLecture.lang as string) || 'Hausa',
        views: 0,
        downloads: 0,
        categories: 'Quran & Tafsir',
        post_date: (firstLecture.post_date as string) || '',
        year: 0,
        key_id: '',
        charts: { daily: 0, monthly: 0, weekly: 0 },
      };

      // Normalize lectures as recitations
      const recitations: RamadanRecitation[] = lecturesArray.map((lecture: unknown, index: number) => {
        const lec = lecture as Record<string, unknown>;
        return {
          id: String(lec.id || lec.nid || `recitation-${index}`),
          title: (lec.title as string) || (lec.lectitle as string) || (lec.Title as string) || 'Untitled',
          duration: (lec.duration as string) || (lec.Duration as string) || '00:00',
          audioUrl: (lec.audio as string) || (lec.mp3_url as string) || (lec.AudioUrl as string) || (lec.mp3 as string) || '',
          trackNumber: index + 1,
          plays: parseInt(String(lec.views || lec.plays || lec.favorites || '0')),
        };
      });

      return { album, recitations };
    } catch (error) {
      console.error('Failed to fetch Ramadan album details:', error);

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Ramadan album details', undefined, error);
    }
  }
}

export const ramadanApi = new RamadanApiService();
