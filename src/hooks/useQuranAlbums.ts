/**
 * Hook to fetch Quran albums (reciters)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { quranApi, QuranAlbum, QuranAlbumsParams } from '../services/api/quran.api';
import { ApiError } from '../services/api/base.api';

interface UseQuranAlbumsResult {
  albums: QuranAlbum[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export const useQuranAlbums = (
  params?: QuranAlbumsParams
): UseQuranAlbumsResult => {
  const [albums, setAlbums] = useState<QuranAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(params?.page || 1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasFetched = useRef(false);
  const inFlight = useRef(false);

  // Skip fetching if params is undefined
  const shouldFetch = params !== undefined;

  const fetchAlbums = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!shouldFetch) return;
      if (inFlight.current) return;

      try {
        inFlight.current = true;
        if (append) {
          setIsLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const response = await quranApi.getQuranAlbums({
          page,
          limit: params?.limit || 20,
        });

        if (append) {
          setAlbums((prev) => [...prev, ...response.albums]);
        } else {
          setAlbums(response.albums);
        }

        setHasMore(response.hasMore);
        setCurrentPage(page);
      } catch (err) {
        if (err instanceof ApiError && err.isCancelled) {
          return;
        }
        console.error('Error fetching Quran albums:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        inFlight.current = false;
      }
    },
    [shouldFetch, params?.limit]
  );

  const refetch = useCallback(() => {
    if (!shouldFetch) return Promise.resolve();
    hasFetched.current = false;
    return fetchAlbums(1, false);
  }, [fetchAlbums, shouldFetch]);

  const loadMore = useCallback(() => {
    if (!shouldFetch || !hasMore || isLoadingMore) return Promise.resolve();
    return fetchAlbums(currentPage + 1, true);
  }, [fetchAlbums, currentPage, hasMore, isLoadingMore, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && !hasFetched.current) {
      hasFetched.current = true;
      fetchAlbums(params?.page || 1, false);
    }
  }, [shouldFetch]);

  return {
    albums,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore,
  };
};
