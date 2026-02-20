/**
 * Custom hook for fetching trending lectures with pagination support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { trendingApi, TrendingLecturesParams } from '../services/api/trending.api';
import { SearchLecture } from '../types/api.types';
import { Episode } from '../types/types';
import { ApiError } from '../services/api/base.api';
import { logger } from '@/utils/logger';

const PLACEHOLDER_SPEAKER_NAMES = new Set([
  'dawahnigeria',
  'unknown',
  'unknown lecturer',
  'unknown scholar',
  'n/a',
]);
const DAWAH_NIGERIA_PATTERN = /\bdawah\s*nigeria\b/i;

const pickSpeakerName = (candidates: Array<string | undefined | null>): string | undefined => {
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (PLACEHOLDER_SPEAKER_NAMES.has(trimmed.toLowerCase())) continue;
    if (DAWAH_NIGERIA_PATTERN.test(trimmed)) continue;
    return trimmed;
  }
  return undefined;
};

export interface UseTrendingResult {
  lectures: Episode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentPage: number;
}

export const useTrending = (initialParams: TrendingLecturesParams = {}): UseTrendingResult => {
  const [lectures, setLectures] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialParams.page || 1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  // Store initialParams in a ref to avoid re-creating fetchTrending on every render
  const paramsRef = useRef(initialParams);

  // Serialize params for stable comparison
  const paramsKey = JSON.stringify(initialParams);

  // Update ref when params actually change (deep comparison via serialization)
  useEffect(() => {
    paramsRef.current = initialParams;
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTrending = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      if (append) {
        setIsLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = { ...paramsRef.current, page, limit: paramsRef.current.limit || 20 };
      logger.debug('Fetching trending lectures with params:', params);
      const response = await trendingApi.getTrendingLectures(params);

      logger.debug('Trending lectures fetched successfully:', {
        count: response.data.length,
        page: response.page,
        total: response.total
      });

      // Transform SearchLecture to Episode format with validation
      const transformedLectures: Episode[] = response.data
        .filter(lecture => {
          const audioSource = lecture.audio || lecture.mp3_url || lecture.AudioUrl;
          const hasRequiredFields = lecture.nid && lecture.Title && audioSource;
          if (!hasRequiredFields) {
            console.warn('⚠️ Skipping invalid lecture:', {
              nid: lecture.nid,
              title: lecture.Title,
              hasAudioSource: !!audioSource,
            });
          }
          return hasRequiredFields;
        })
        .map((lecture: SearchLecture) => {
          const reciterName =
            (lecture as SearchLecture & { reciter_name?: string; reciterName?: string }).reciter_name
            || (lecture as SearchLecture & { reciter_name?: string; reciterName?: string }).reciterName
            || (lecture as any).reciter_name
            || undefined;

          return {
            id: lecture.nid!.toString(),
            title: lecture.Title!,
            durationSec: parseDuration(lecture.duration || lecture.mp3_duration || '0:00:00'),
            coverUrl: lecture.img || lecture.CoverUrl || '',
            audioUrl: lecture.audio || lecture.mp3_url || lecture.AudioUrl || '',
            seriesId: lecture.keyword || '',
            plays: parseInt(lecture.favorites?.toString() || '0') || 0,
            liked: false,
            language: lecture.lang || lecture.language || lecture.Language || '',
            downloads: parseInt(lecture.share?.toString() || '0') || 0,
            createdAt: lecture.created_at || '',
            lecturerName:
              pickSpeakerName([
                lecture.lecturer_name,
                lecture.rpname,
                reciterName,
                lecture.ResourcePerson,
                (lecture as any).LecturerName,
              ]) || '',
            rpname: lecture.rpname,
            reciter_name: reciterName,
            isReciter: Boolean((lecture as SearchLecture & { is_reciter?: boolean }).is_reciter),
          };
        });

      // Append or replace lectures based on pagination
      if (append) {
        // With client-side pagination, items should already be unique
        // But keep deduplication as a safety measure
        setLectures(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newLectures = transformedLectures.filter(l => !existingIds.has(l.id));

          if (newLectures.length === 0 && transformedLectures.length > 0) {
            console.warn('⚠️ All items were duplicates - this should not happen with client-side pagination');
          }

          logger.debug(`Loading more: Got ${transformedLectures.length} items, ${newLectures.length} are new, total now: ${prev.length + newLectures.length}`);
          return [...prev, ...newLectures];
        });
      } else {
        logger.debug(`Initial load: Got ${transformedLectures.length} items`);
        setLectures(transformedLectures);
      }

      // Check if there are more pages based on total count from API
      const totalItems = response.total;
      const totalPages = response.total_pages;
      const hasMorePages = page < totalPages;

      logger.debug(`Pagination status: Page ${page}/${totalPages}, Total items: ${totalItems}, Has more: ${hasMorePages}`);

      setHasMore(hasMorePages);
      setCurrentPage(page);
    } catch (err: any) {
      if (err instanceof ApiError && err.isCancelled) {
        return;
      }
      console.error('❌ Error fetching trending lectures:', err);
      setError(err.message || 'Failed to fetch trending lectures');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, []); // Empty deps - uses refs for params

  // Load more function for infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading || isLoadingRef.current) return;
    await fetchTrending(currentPage + 1, true);
  }, [hasMore, isLoadingMore, loading, currentPage, fetchTrending]);

  // Helper function to parse duration string to seconds
  function parseDuration(duration: string): number {
    if (!duration) return 0;

    const parts = duration.split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts.map(Number);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const [minutes, seconds] = parts.map(Number);
      return minutes * 60 + seconds;
    }

    return 0;
  }

  // Fetch initial data on mount and when params change (using serialized key for stable comparison)
  useEffect(() => {
    logger.debug('useTrending mount/update - initialParams:', initialParams);

    if (!initialParams) {
      logger.debug('useTrending: initialParams is undefined/null, skipping fetch');
      setLoading(false);
      setHasMore(false);
      return;
    }

    const paramKeys = Object.keys(initialParams);
    if (paramKeys.length === 0) {
      logger.debug('useTrending: initialParams is empty object, skipping fetch');
      setLoading(false);
      setHasMore(false);
      return;
    }

    logger.debug('useTrending: Fetching data with params:', initialParams);
    fetchTrending(1, false);
  }, [paramsKey, fetchTrending]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch function with cache clearing
  const refetch = useCallback(async () => {
    trendingApi.clearCache(); // Clear cache to force fresh data
    await fetchTrending(1, false);
  }, [fetchTrending]);

  return {
    lectures,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore,
    currentPage,
  };
};
