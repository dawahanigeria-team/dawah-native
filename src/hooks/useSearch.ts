/**
 * Custom React hooks for search functionality
 * Provides optimized search with debouncing, caching, and state management
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api/base.api';
import { searchApi } from '../services/api/search.api';
import {
    QuickSearchResponse,
    SearchAlbum,
    SearchLecture,
    SearchLecturer,
    SearchPlaylist,
    SearchResponse,
    SearchType,
} from '../types/api.types';

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
  filters: Record<string, any>;
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
    filters: {},
  });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceDelay);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SearchResponse<T>>>(new Map());
  const loadMoreInFlight = useRef(false);
  const filtersRef = useRef<Record<string, any>>(state.filters);
  useEffect(() => {
    filtersRef.current = state.filters;
  }, [state.filters]);

  // Search function
  const performSearch = useCallback(
    async (searchQuery: string, page = 1, append = false, searchFilters = state.filters) => {
      // Validate query length
      if (!searchQuery || searchQuery.trim().length < minQueryLength) {
        setState(prev => ({
          ...prev,
          data: null,
          loading: false,
          error: null,
          hasMore: false,
          query: searchQuery,
          filters: searchFilters,
        }));
        return;
      }

      if (append) {
        if (loadMoreInFlight.current) {
          return;
        }
        loadMoreInFlight.current = true;
      }

      // Check cache
      // Include filters in cache key
      const filterKey = JSON.stringify(searchFilters);
      const cacheKey = `${searchType}_${searchQuery}_${page}_${filterKey}`;
      
      if (cacheResults && cacheRef.current.has(cacheKey) && !append) {
        const cachedData = cacheRef.current.get(cacheKey)!;
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          error: null,
          hasMore: page < cachedData.total_pages,
          query: searchQuery,
          filters: searchFilters,
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
        filters: searchFilters,
      }));

      try {
        // Map UI filters to API params
        const apiParams: any = {
          type: searchType,
          query: searchQuery,
          page,
          quick: enableQuickSearch && page === 1,
          ...searchFilters
        };
        
        // Handle specific filter mappings if needed
        if (searchFilters.topic && searchFilters.topic !== 'All') {
          apiParams.category = searchFilters.topic;
        }
        
        if (searchFilters.lecturerId) {
          apiParams.lecturer_nid = searchFilters.lecturerId;
        }

        // Date sort belongs on the server: a query can match tens of thousands
        // of rows paginated 20 at a time, so reordering the loaded page would
        // look right and be wrong. Only the date options map — the rest
        // (followers/views/A-Z) are lecturer-list concerns the search API
        // doesn't accept, and sending them through would be ignored anyway.
        const dateSort: Record<string, 'desc' | 'asc'> = {
          recent: 'desc',
          oldest: 'asc',
        };
        if (dateSort[searchFilters.sortBy]) {
          apiParams.sortBy = dateSort[searchFilters.sortBy];
        } else {
          delete apiParams.sortBy;
        }

        const response = await searchApi.search<T>({
          ...apiParams,
          signal: abortControllerRef.current?.signal,
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
          filters: searchFilters,
        }));
      } catch (error) {
        if (error instanceof ApiError && error.isCancelled) {
          return; // Ignore cancelled requests
        }
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Ignore abort errors
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof ApiError ? error : new ApiError('Search failed'),
        }));
      } finally {
        if (append) {
          loadMoreInFlight.current = false;
        }
      }
    },
    [searchType, minQueryLength, cacheResults, enableQuickSearch, state.filters]
  );

  // Refs to keep setFilters stable
  const performSearchRef = useRef(performSearch);
  performSearchRef.current = performSearch;
  
  const queryRef = useRef(query);
  queryRef.current = query;

  // Update setFilters to trigger search
  // This function is now stable and won't change on re-renders
  const setFilters = useCallback((newFilters: Record<string, any>) => {
    // Only update if filters actually changed
    const currentFilters = filtersRef.current;
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(newFilters);

    if (filtersChanged) {
      setState(prev => ({ ...prev, filters: newFilters }));
      // performSearch will be triggered by the useEffect when state.filters changes
    }
  }, []);

  // Effect to perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, 1, false, state.filters);
    }
  }, [debouncedQuery, performSearch, state.filters]); // Added state.filters dependency

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore && state.query && !loadMoreInFlight.current) {
      performSearch(state.query, state.page + 1, true, state.filters);
    }
  }, [state.loading, state.hasMore, state.query, state.page, performSearch, state.filters]);


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
      filters: {},
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
    setFilters,
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
