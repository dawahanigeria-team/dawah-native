/**
 * usePopularLecturesWithCache
 *
 * Backs the "Trending Now" rail on the home screen. Previously hit
 * /api/popular_lec_api.php through `offlineFirstApi`, which sorted by
 * lifetime views and could surface multi-year-old lectures.
 *
 * Now delegates to `recentApi.getTrendingLectures()`, which computes a
 * velocity score (views ÷ days-since-post) across all langids within a
 * recency window. Same return shape as before — callers don't change.
 *
 * Note: the previous offline-storage cache via `offlineFirstApi` is no
 * longer used here. The in-memory cache inside `recentApi` (5 min) is
 * sufficient for typical session use; if cold-launch-while-offline is
 * needed for this rail, layer AsyncStorage on top — out of scope here.
 */

import { useCallback, useEffect, useState } from 'react';
import { recentApi } from '../services/api/recent.api';
import { SearchLecture } from '../types/api.types';
import { captureSentryException } from '../services/config/sentry.config';
import { logger } from '../utils/logger';

const TRENDING_RAIL_LIMIT = 20;

export interface UsePopularLecturesResult {
  lectures: SearchLecture[];
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
  refresh: () => Promise<void>;
}

export const usePopularLecturesWithCache = (): UsePopularLecturesResult => {
  const [lectures, setLectures] = useState<SearchLecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchLectures = useCallback(async (forceFresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      if (forceFresh) recentApi.clearCache();

      const response = await recentApi.getTrendingLectures({
        page: 1,
        limit: TRENDING_RAIL_LIMIT,
      });

      setLectures(response.data);
      setIsFromCache(!forceFresh);
      logger.debug(
        `Loaded ${response.data.length} trending-rail lectures (${response.total} candidates)`,
      );
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch lectures';
      setError(message);
      logger.error('Error fetching trending-rail lectures', err, {
        operation: 'fetch_trending_rail',
        forceFresh,
      });
      captureSentryException(err, {
        operation: 'fetch_trending_rail',
        forceFresh,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const refresh = useCallback(async () => {
    await fetchLectures(true);
  }, [fetchLectures]);

  return {
    lectures,
    isLoading,
    error,
    isFromCache,
    refresh,
  };
};
