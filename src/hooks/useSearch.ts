/**
 * Custom React hooks for search functionality
 * Provides optimized search with debouncing, caching, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchApi } from '../services/api/search.api';
import {
  SearchType,
  SearchResponse,
  QuickSearchResponse,
  SearchLecture,
  SearchLecturer,
  SearchAlbum,
  SearchPlaylist,
} from '../types/api.types';
import { ApiError } from '../services/api/base.api';

// Hook configuration interface
interface UseSearchConfig {
  debounceDelay?: number;
  minQueryLength?: number;
  enableQuickSearch?: boolean;
  cacheResults?: boolean;
}

// Search state interface
interface SearchState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  query: string;
  hasMore: boolean;
  page: number;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Main search hook with debouncing and state management
 */
export function useSearch<T = any>(
  searchType: SearchType,
  config: UseSearchConfig = {}
) {
  const {
    debounceDelay = 300,
    minQueryLength = 2,
    enableQuickSearch = true,
    cacheResults = true,
  } = config;

  const [state, setState] = useState<SearchState<SearchResponse<T>>>({
    data: null,
    loading: false,
    error: null,
    query: '',
    hasMore: false,
    page: 1,
  });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceDelay);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SearchResponse<T>>>(new Map());

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string, page = 1, append = false) => {
      // Validate query length
      if (!searchQuery || searchQuery.trim().length < minQueryLength) {
        setState(prev => ({
          ...prev,
          data: null,
          loading: false,
          error: null,
          hasMore: false,
        }));
        return;
      }

      // Check cache
      const cacheKey = `${searchType}_${searchQuery}_${page}`;
      if (cacheResults && cacheRef.current.has(cacheKey) && !append) {
        const cachedData = cacheRef.current.get(cacheKey)!;
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          error: null,
          hasMore: page < cachedData.total_pages,
        }));
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await searchApi.search<T>({
          type: searchType,
          query: searchQuery,
          page,
          quick: enableQuickSearch && page === 1,
        });

        // Cache result
        if (cacheResults) {
          cacheRef.current.set(cacheKey, response);
        }

        setState(prev => ({
          ...prev,
          data: append && prev.data
            ? {
                ...response,
                data: [...(prev.data.data || []), ...response.data],
              }
            : response,
          loading: false,
          error: null,
          query: searchQuery,
          hasMore: page < response.total_pages,
          page,
        }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Ignore abort errors
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof ApiError ? error : new ApiError('Search failed'),
        }));
      }
    },
    [searchType, minQueryLength, cacheResults, enableQuickSearch]
  );

  // Effect to perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, 1);
    }
  }, [debouncedQuery, performSearch]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore && state.query) {
      performSearch(state.query, state.page + 1, true);
    }
  }, [state.loading, state.hasMore, state.query, state.page, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setState({
      data: null,
      loading: false,
      error: null,
      query: '',
      hasMore: false,
      page: 1,
    });
    cacheRef.current.clear();
  }, []);

  // Retry failed search
  const retry = useCallback(() => {
    if (state.query) {
      performSearch(state.query, state.page);
    }
  }, [state.query, state.page, performSearch]);

  return {
    // State
    data: state.data?.data || [],
    loading: state.loading,
    error: state.error,
    totalResults: state.data?.total || 0,
    hasMore: state.hasMore,
    currentPage: state.page,
    totalPages: state.data?.total_pages || 0,

    // Actions
    setQuery,
    clearSearch,
    loadMore,
    retry,

    // Utils
    query,
    debouncedQuery,
  };
}

/**
 * Quick search hook for typeahead/autocomplete
 */
export function useQuickSearch(config: UseSearchConfig = {}) {
  const { debounceDelay = 150, minQueryLength = 1 } = config;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<QuickSearchResponse['results']>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, debounceDelay);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchApi
      .quickSearch(debouncedQuery)
      .then(response => {
        if (!cancelled) {
          setResults(response.results);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, minQueryLength]);

  return {
    query,
    setQuery,
    results,
    loading,
    clearResults: () => {
      setQuery('');
      setResults([]);
    },
  };
}

/**
 * Search suggestions hook
 */
export function useSearchSuggestions(partialQuery: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(partialQuery, 200);

  useEffect(() => {
    if (!enabled || !debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    searchApi
      .getSuggestions(debouncedQuery)
      .then(results => {
        if (!cancelled) {
          setSuggestions(results);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, enabled]);

  return { suggestions, loading };
}

/**
 * Recent searches hook
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    // Load recent searches on mount
    setRecentSearches(searchApi.getRecentSearches());
  }, []);

  const clearRecent = useCallback(() => {
    searchApi.clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const removeRecent = useCallback((query: string) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
  }, [recentSearches]);

  return {
    recentSearches,
    clearRecent,
    removeRecent,
  };
}

/**
 * Specialized hooks for different search types
 */
export function useSearchLectures(config?: UseSearchConfig) {
  return useSearch<SearchLecture>('lectures', config);
}

export function useSearchLecturers(config?: UseSearchConfig) {
  return useSearch<SearchLecturer>('lecturers', config);
}

export function useSearchAlbums(config?: UseSearchConfig) {
  return useSearch<SearchAlbum>('albums', config);
}

export function useSearchPlaylists(config?: UseSearchConfig) {
  return useSearch<SearchPlaylist>('playlists', config);
}

/**
 * Combined search hook for searching all content types
 */
export function useSearchAll(config: UseSearchConfig = {}) {
  const { debounceDelay = 300, minQueryLength = 2 } = config;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    lectures: SearchLecture[];
    lecturers: SearchLecturer[];
    albums: SearchAlbum[];
    playlists: SearchPlaylist[];
    total: number;
  }>({
    lectures: [],
    lecturers: [],
    albums: [],
    playlists: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const debouncedQuery = useDebounce(query, debounceDelay);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      setResults({
        lectures: [],
        lecturers: [],
        albums: [],
        playlists: [],
        total: 0,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchApi
      .searchAll(debouncedQuery, 1)
      .then(response => {
        if (!cancelled) {
          setResults(response);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err : new ApiError('Search failed'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, minQueryLength]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    clearSearch: () => {
      setQuery('');
      setResults({
        lectures: [],
        lecturers: [],
        albums: [],
        playlists: [],
        total: 0,
      });
    },
  };
}

/**
 * Infinite scroll search hook
 */
export function useInfiniteSearch<T = any>(
  searchType: SearchType,
  initialQuery = '',
  config: UseSearchConfig = {}
) {
  const search = useSearch<T>(searchType, config);
  const observerTarget = useRef<HTMLElement | null>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && search.hasMore && !search.loading) {
          search.loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [search.hasMore, search.loading, search.loadMore]);

  // Set initial query
  useEffect(() => {
    if (initialQuery) {
      search.setQuery(initialQuery);
    }
  }, [initialQuery, search.setQuery]);

  return {
    ...search,
    observerTarget,
  };
}