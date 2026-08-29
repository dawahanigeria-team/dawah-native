/**
 * Categories API Service
 *
 * The topic taxonomy behind the Browse > Categories tile. Note the endpoint
 * names: API_CONFIG previously pointed at categorylist.php and
 * categorylectures.php, neither of which exists - both 500. The live endpoints
 * are allcateg_api.php and leclisting_cat_api.php.
 */

import { ApiError, apiClient } from './base.api';
import { API_CONFIG } from '../config/api.config';
import type { LecturerLecture } from './lecturers.api';
import { logger } from '@/utils/logger';

export interface Category {
  id: string;
  name: string;
  img: string;
  /**
   * Absent on unreviewed rows. Verified against the live endpoint: all 34
   * curated categories carry status 1, and the only three rows without it are
   * junk with zero lectures ("qura", "qur", and a duplicate "Quran &
   * Tafseer") - so presence of status 1 is the marker, not absence of 0.
   */
  status?: number;
}

/**
 * Only rows the backend has marked live. A `status !== 0` test would let the
 * unreviewed rows through, because they omit the field entirely.
 */
export const isPublishedCategory = (category: Category): boolean =>
  Boolean(category) && category.status === 1;

/** leclisting_cat_api.php returns 100 rows per page, not the usual 10. */
export const CATEGORY_LECTURES_PAGE_SIZE = 100;

class CategoriesApiService {
  /**
   * Every category, alphabetical by name as the backend returns them.
   * There are ~37, so this is a single unpaginated call.
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<unknown>(
      API_CONFIG.ENDPOINTS.CATEGORIES,
      undefined,
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: true,
        // The taxonomy changes rarely; treat it like other static content.
        cacheTTL: API_CONFIG.CACHE.CATEGORIES_TTL,
      },
    );

    if (!Array.isArray(response.data)) {
      // Same trap as the lectures list: coercing an unreadable body to [] makes
      // a failed request indistinguishable from "there are no categories".
      // Drop the poisoned cache entry first - cache writes are not gated on
      // useCache, so a retry inside the TTL would replay it.
      await apiClient.clearCache('allcateg_api.php');
      throw new ApiError('Categories response was not a list', undefined, response.data);
    }

    return (response.data as Category[]).filter(isPublishedCategory);
  }

  /**
   * Lectures within one category.
   */
  async getCategoryLectures(
    categoryId: string | number,
    page = 1,
  ): Promise<{ data: LecturerLecture[]; page: number; hasMore: boolean }> {
    logger.debug('Fetching lectures for category:', categoryId, 'page', page);

    const response = await apiClient.get<unknown>(
      API_CONFIG.ENDPOINTS.CATEGORY_LECTURES,
      { catid: categoryId, page },
      {
        timeout: API_CONFIG.TIMEOUTS.DEFAULT,
        useCache: true,
        cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
      },
    );

    if (!Array.isArray(response.data)) {
      await apiClient.clearCache(
        `leclisting_cat_api.php?catid=${categoryId}&page=${page}`,
      );
      throw new ApiError(
        'Category lectures response was not a list',
        undefined,
        response.data,
      );
    }

    const lectures = response.data as LecturerLecture[];

    return {
      data: lectures,
      page,
      hasMore: lectures.length >= CATEGORY_LECTURES_PAGE_SIZE,
    };
  }
}

export const categoriesApi = new CategoriesApiService();
