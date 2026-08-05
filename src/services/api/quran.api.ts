/**
 * Quran API Service
 * Handles Quran reciters (albums) and recitations
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';
import { logger } from '@/utils/logger';
import { getSurahNumber, sortRecitationsInQuranOrder } from '@/utils/quran';

export interface QuranAlbum {
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
  charts: {
    daily: number;
    monthly: number;
    weekly: number;
  };
  reciterId?: string;
  albumIds?: string[];
}

export interface QuranAlbumsParams {
  page?: number;
  limit?: number;
}

export interface QuranAlbumsResponse {
  albums: QuranAlbum[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface QuranRecitation {
  id: string;
  title: string;
  duration: string;
  audioUrl: string;
  trackNumber?: number;
  plays?: number;
  surahNumber?: number;
}

export interface QuranAlbumDetail {
  album: QuranAlbum;
  recitations: QuranRecitation[];
}

class QuranApiService {
  /**
   * Fetch Quran albums (reciters)
   */
  async getQuranAlbums(params: QuranAlbumsParams = {}): Promise<QuranAlbumsResponse> {
    const { page = 1, limit = 20 } = params;
    const requestParams = {
      action: 'get_quran_album',
      page: page.toString(),
      limit: limit.toString(),
      include_meta: '1',
    };

    try {
      addSentryBreadcrumb('Fetching Quran albums', 'query', { page, limit });

      const response = await apiClient.get<any>(
        '/api/dn_quran_api.php',
        requestParams,
        {
          timeout: 60000,
          useCache: true,
          cacheTTL: 600, // Cache for 10 minutes
        }
      );

      const payload = response.data;
      const rawAlbums = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
      const pagination = !Array.isArray(payload) ? payload?.pagination : undefined;

      const albums: QuranAlbum[] = rawAlbums.map((item: any) => ({
        id: String(item.id),
        name: item.name || 'Unknown Reciter',
        img: item.img || '',
        alb_thumbnail: item.alb_thumbnail || item.img || '',
        lec_no: item.lec_no || 0,
        language: item.language || 'Arabic',
        views: item.views || 0,
        downloads: item.downloads || 0,
        categories: item.categories || '',
        post_date: item.post_date || '',
        charts: item.charts || { daily: 0, monthly: 0, weekly: 0 },
        reciterId: item.reciter_id ? String(item.reciter_id) : undefined,
        albumIds: Array.isArray(item.album_ids) ? item.album_ids.map(String) : [String(item.id)],
      }));

      logger.debug(`Fetched ${albums.length} Quran albums`);

      return {
        albums,
        total: Number(pagination?.total) || albums.length,
        page,
        hasMore: typeof pagination?.has_more === 'boolean' ? pagination.has_more : albums.length >= limit,
      };
    } catch (error) {
      if (error instanceof ApiError && error.isTimeout) {
        const cached = await apiClient.getCachedResponse<any>(
          '/api/dn_quran_api.php',
          requestParams
        );
        if (cached) {
          const cachedPayload = cached.data;
          const rawAlbums = Array.isArray(cachedPayload)
            ? cachedPayload
            : (Array.isArray(cachedPayload?.data) ? cachedPayload.data : []);
          const pagination = !Array.isArray(cachedPayload) ? cachedPayload?.pagination : undefined;
          const albums: QuranAlbum[] = rawAlbums.map((item: any) => ({
            id: String(item.id),
            name: item.name || 'Unknown Reciter',
            img: item.img || '',
            alb_thumbnail: item.alb_thumbnail || item.img || '',
            lec_no: item.lec_no || 0,
            language: item.language || 'Arabic',
            views: item.views || 0,
            downloads: item.downloads || 0,
            categories: item.categories || '',
            post_date: item.post_date || '',
            charts: item.charts || { daily: 0, monthly: 0, weekly: 0 },
            reciterId: item.reciter_id ? String(item.reciter_id) : undefined,
            albumIds: Array.isArray(item.album_ids) ? item.album_ids.map(String) : [String(item.id)],
          }));

          addSentryBreadcrumb('Quran albums timeout: using cached data', 'cache', {
            page,
            limit,
            cachedCount: albums.length,
          });

          return {
            albums,
            total: Number(pagination?.total) || albums.length,
            page,
            hasMore: typeof pagination?.has_more === 'boolean' ? pagination.has_more : albums.length >= limit,
          };
        }
      }
      console.error('❌ Failed to fetch Quran albums:', error);
      captureSentryException(error as Error, {
        component: 'QuranApiService',
        action: 'getQuranAlbums',
        params,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Quran albums', undefined, error);
    }
  }

  /**
   * Get Quran album details with recitations
   */
  async getQuranAlbumDetails(albumId: string, albumIds: string[] = [albumId]): Promise<QuranAlbumDetail> {
    try {
      logger.debug('Fetching Quran album details:', albumId);

      addSentryBreadcrumb('Fetching Quran album details', 'http', {
        albumId,
        endpoint: '/api/albumapi3.php',
      });

      const uniqueAlbumIds = Array.from(new Set([albumId, ...albumIds].filter(Boolean)));
      const responses = await Promise.all(uniqueAlbumIds.map((id) => apiClient.get<any>(
        '/api/albumapi3.php',
        { aid: id, page: 1 },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 600,
        },
      )));

      // API returns array of lectures directly
      const lecturesArray = responses.flatMap((response) => (
        Array.isArray(response) ? response : (Array.isArray(response.data) ? response.data : [])
      ));

      if (lecturesArray.length === 0) {
        throw new ApiError('No recitations found in album', 404);
      }

      // Extract album info from first lecture (all have same album info)
      const firstLecture = lecturesArray[0];
      const album: QuranAlbum = {
        id: albumId,
        name: firstLecture.album_name || 'Unknown Reciter',
        img: firstLecture.lec_img || firstLecture.mp3_thumbnail || '',
        alb_thumbnail: firstLecture.alb_thumbnail || firstLecture.lec_img || '',
        lec_no: lecturesArray.length,
        language: firstLecture.lang || 'Arabic',
        views: 0,
        downloads: 0,
        categories: 'Quran & Tafsir',
        post_date: firstLecture.post_date || '',
        charts: { daily: 0, monthly: 0, weekly: 0 },
        reciterId: firstLecture.rp_id ? String(firstLecture.rp_id) : undefined,
        albumIds: uniqueAlbumIds,
      };

      // Normalize lectures as recitations
      const seenIds = new Set<string>();
      const recitations = sortRecitationsInQuranOrder(lecturesArray.map((lecture: any, index: number) => ({
        id: String(lecture.id || lecture.nid || `recitation-${index}`),
        title: lecture.title || lecture.lectitle || lecture.Title || 'Untitled Recitation',
        duration: lecture.duration || lecture.Duration || '00:00',
        audioUrl: lecture.audio || lecture.mp3_url || lecture.AudioUrl || lecture.mp3 || '',
        trackNumber: index + 1,
        plays: parseInt(String(lecture.views || lecture.plays || lecture.favorites || '0')),
        surahNumber: getSurahNumber(
          lecture.title || lecture.lectitle || lecture.Title || '',
          Number(lecture.surah_number) || undefined,
        ),
      })).filter((recitation) => {
        if (seenIds.has(recitation.id)) return false;
        seenIds.add(recitation.id);
        return true;
      }));

      logger.debug(`Fetched Quran album: ${album.name} with ${recitations.length} recitations`);

      return { album, recitations };
    } catch (error) {
      console.error('❌ Failed to fetch Quran album details:', error);
      captureSentryException(error as Error, {
        component: 'QuranApiService',
        action: 'getQuranAlbumDetails',
        albumId,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch Quran album details', undefined, error);
    }
  }
}

export const quranApi = new QuranApiService();
