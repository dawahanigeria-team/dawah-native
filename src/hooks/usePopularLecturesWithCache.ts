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
 * The last successful result is also stored persistently. A cold offline
 * launch can therefore render useful discovery content immediately instead
 * of showing an empty home rail.
 */

import { useCallback, useEffect, useState } from 'react';
import { recentApi, type RecentLecturesParams } from '../services/api/recent.api';
import { cacheService } from '../services/cache/cache.service';
import { SearchLecture } from '../types/api.types';
import { captureSentryException } from '../services/config/sentry.config';
import { logger } from '../utils/logger';

const TRENDING_RAIL_LIMIT = 20;
const TRENDING_CACHE_KEY = 'cache_trending_lectures_v3';
const TRENDING_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface UsePopularLecturesResult {
  lectures: SearchLecture[];
  isLoading: boolean;
  error: string | null;
  isFromCache: boolean;
  refresh: () => Promise<void>;
}

type PopularLecturesOptions = Pick<
  RecentLecturesParams,
  'languageIds' | 'lecturerIds'
> & { enabled?: boolean };

export const usePopularLecturesWithCache = (
  options: PopularLecturesOptions = {},
): UsePopularLecturesResult => {
  const [lectures, setLectures] = useState<SearchLecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const languageKey = [...(options.languageIds ?? [])].sort((a, b) => a - b).join(',');
  const lecturerKey = [...(options.lecturerIds ?? [])].sort((a, b) => a - b).join(',');
  const enabled = options.enabled ?? true;
  const cacheKey = `${TRENDING_CACHE_KEY}:l:${languageKey}:r:${lecturerKey}`;

  const fetchLectures = useCallback(async (forceFresh = false) => {
    if (!enabled) return;
    let cachedLectures: SearchLecture[] | null = null;
    try {
      // Must await: clearing only the in-memory pool leaves the persisted
      // pages in place and the 'refresh' hands back the same content.
      if (forceFresh) await recentApi.clearPersistentCache();

      if (!forceFresh) {
        cachedLectures = await cacheService.get<SearchLecture[]>(
          cacheKey,
        );
        if (cachedLectures?.length) {
          setLectures(cachedLectures);
          setIsFromCache(true);
          setIsLoading(false);
        }
      }

      setIsLoading(!cachedLectures?.length);
      setError(null);

      const response = await recentApi.getTrendingLectures({
        page: 1,
        limit: TRENDING_RAIL_LIMIT,
        languageIds: options.languageIds,
        lecturerIds: options.lecturerIds,
      });

      setLectures(response.data);
      setIsFromCache(false);
      await cacheService.set(
        cacheKey,
        response.data,
        TRENDING_CACHE_TTL_SECONDS,
      );
      logger.debug(
        `Loaded ${response.data.length} trending-rail lectures (${response.total} candidates)`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lectures';
      if (!cachedLectures?.length) setError(message);
      logger.error('Error fetching trending-rail lectures', err, {
        operation: 'fetch_trending_rail',
        forceFresh,
      });
      captureSentryException(err instanceof Error ? err : new Error(message), {
        operation: 'fetch_trending_rail',
        forceFresh,
      });
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, enabled, options.languageIds, options.lecturerIds]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = setTimeout(() => {
      void fetchLectures();
    }, 0);
    return () => clearTimeout(timer);
  }, [enabled, fetchLectures]);

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
