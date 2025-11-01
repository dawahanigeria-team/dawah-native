/**
 * Lecture Detail API Service
 * Fetches detailed information about a single lecture
 */

import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import type { LectureDetailApiItem, LectureDetail } from '../../types/api.types';

export interface LectureDetailParams {
  lectureId: string | number;
  useCache?: boolean;
}

interface LectureDetailCacheEntry {
  lecture: LectureDetail;
  timestamp: number;
}

class LectureDetailApiService {
  private cache = new Map<string, LectureDetailCacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch lecture detail
   */
  async getLectureDetail(params: LectureDetailParams): Promise<LectureDetail> {
    const { lectureId, useCache = true } = params;
    const cacheKey = lectureId.toString();
    const now = Date.now();

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && now - cached.timestamp < this.CACHE_DURATION) {
        return cached.lecture;
      }
    }

    try {
      console.log('🎯 LectureDetailApi: Fetching lecture detail', { lectureId });

      const response = await apiClient.get<any>(
        '/api/leclistingapi.php',
        { lecid: lectureId },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache,
          cacheTTL: 300,
        },
      );

      const lecture = this.normalizeResponse(response.data, lectureId);

      if (useCache) {
        this.cache.set(cacheKey, { lecture, timestamp: now });
      }

      return lecture;
    } catch (error) {
      console.error('❌ LectureDetailApi: Error fetching lecture detail', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to fetch lecture detail', undefined, error);
    }
  }

  /**
   * Clear cached lecture
   */
  clearCache(lectureId?: string | number): void {
    if (lectureId) {
      this.cache.delete(lectureId.toString());
    } else {
      this.cache.clear();
    }
  }

  private normalizeResponse(data: any, lectureId: string | number): LectureDetail {
    const items: LectureDetailApiItem[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : data
          ? [data]
          : [];

    if (!items.length) {
      throw new ApiError(`Lecture with id ${lectureId} not found`, 404);
    }

    const item = items[0];

    const durationSeconds = this.parseDurationToSeconds(item.duration);
    const views = this.parseNumber(item.views);
    const favorites = this.parseNumber(item.favorites);
    const shares = this.parseNumber(item.share);
    const downloads = this.parseNumber(item.downloads);
    const comments = this.parseNumber(item.comment);

    const lecture: LectureDetail = {
      id: String(item.nid ?? lectureId),
      title: item.Title ?? 'Untitled Lecture',
      description: item.description ?? '',
      audioUrl: item.audio ?? '',
      amrUrl: item.amr_url || '',
      coverUrl: item.img || item.lec_img || '',
      backdropUrl: item.lec_img || item.img || '',
      durationSec: durationSeconds,
      durationLabel: item.duration ?? '',
      mp3Size: item.mp3_size ?? '',
      amrSize: item.amr_size ?? '',
      categories: this.parseCategories(item.cats),
      categoryIds: Array.isArray(item.cat_id) ? item.cat_id : [],
      albumId: item.album_id ? String(item.album_id) : '',
      albumName: item.album_name ?? '',
      views,
      favorites,
      shares,
      downloads,
      comments,
      language: item.lang ?? '',
      lecturerName: item.rpname ?? '',
      updatedDate: item.updated_date ?? '',
      postedDate: item.post_date ?? '',
      charts: item.charts ?? {},
      reciter: {
        id: item.reciter_id ?? 0,
        name: item.reciter_name ?? '',
        image: item.reciter_image ?? '',
        isReciter: item.is_reciter ?? false,
      },
      raw: item,
    };

    return lecture;
  }

  private parseDurationToSeconds(duration?: string): number {
    if (!duration || typeof duration !== 'string') {
      return 0;
    }

    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/[^0-9.-]/g, ''), 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseCategories(cats?: string): string[] {
    if (!cats) return [];
    if (Array.isArray(cats)) return cats;
    return cats.split(',').map(cat => cat.trim()).filter(Boolean);
  }
}

export const lectureDetailApi = new LectureDetailApiService();
