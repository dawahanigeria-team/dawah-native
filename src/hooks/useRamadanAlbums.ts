/**
 * Hook to fetch Ramadan Tafsir albums
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ramadanApi, RamadanAlbum, RamadanAlbumsParams } from '../services/api/ramadan.api';

interface UseRamadanAlbumsResult {
  albums: RamadanAlbum[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export const useRamadanAlbums = (
  params?: RamadanAlbumsParams
): UseRamadanAlbumsResult => {
  const [albums, setAlbums] = useState<RamadanAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(params?.page ?? 1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasFetched = useRef(false);

  // Skip fetching if params is undefined
  const shouldFetch = params !== undefined;

  // Read off `params` here rather than inside the callback below. Closing over
  // the object while declaring `params?.limit` as the dependency makes the
  // compiler infer a dependency on all of `params`, which it cannot reconcile
  // with the narrower list - so it gives up and leaves this whole hook
  // unoptimized. Closing over the primitives instead lets it through.
  const limit = params?.limit ?? 20;
  const initialPage = params?.page ?? 1;

  const fetchAlbums = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!shouldFetch) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const response = await ramadanApi.getRamadanAlbums({
          page,
          limit,
        });

        if (append) {
          setAlbums((prev) => [...prev, ...response.albums]);
        } else {
          setAlbums(response.albums);
        }

        setHasMore(response.hasMore);
        setCurrentPage(page);
      } catch (err) {
        console.error('Error fetching Ramadan albums:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [shouldFetch, limit]
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
      fetchAlbums(initialPage, false);
    }
  }, [shouldFetch, fetchAlbums, initialPage]);

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
