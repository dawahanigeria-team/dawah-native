/**
 * Use Popular Lectures with Caching
 * Offline-first hook for fetching popular lectures
 *
 * Features:
 * - Automatic caching (first 20 lectures)
 * - Offline support
 * - Stale-while-revalidate strategy
 */

import { useState, useEffect } from 'react';
import { offlineFirstApi } from '../services/cache/offlineFirst.api';
import { CACHE_CONFIG } from '../services/cache/cache.service';
import { SearchLecture } from '../types/types';
import { captureSentryException } from '../services/config/sentry.config';

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

  const fetchLectures = async (forceFresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching popular lectures with cache...');

      // Use offline-first API
      const data = await offlineFirstApi.get<SearchLecture[]>(
        '/api/search.php',
        {
          sort: 'popular',
          limit: CACHE_CONFIG.LIMITS.POPULAR_LECTURES,
        },
        {
          cacheKey: CACHE_CONFIG.KEYS.POPULAR_LECTURES,
          ttl: CACHE_CONFIG.TTL.LECTURES,
          forceFresh,
          allowStale: true,
        }
      );

      setLectures(data || []);
      setIsFromCache(!forceFresh);
      console.log(`✅ Loaded ${data?.length || 0} popular lectures`);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch lectures';
      setError(errorMessage);
      console.error('❌ Error fetching popular lectures:', errorMessage);

      captureSentryException(err, {
        operation: 'fetch_popular_lectures_with_cache',
        forceFresh,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    await fetchLectures(true); // Force fresh fetch
  };

  return {
    lectures,
    isLoading,
    error,
    isFromCache,
    refresh,
  };
};
