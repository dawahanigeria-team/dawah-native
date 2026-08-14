/**
 * useRecent — fetches the latest lectures (sorted by post_date desc).
 *
 * Mirrors the shape of `useTrending` so it can be a drop-in replacement
 * on any "Fresh Content" / "Just posted" surface.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { recentApi, RecentLecturesParams } from '../services/api/recent.api';
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

const pickSpeakerName = (
  candidates: Array<string | undefined | null>,
): string | undefined => {
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

function parseDuration(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':');
  if (parts.length === 3) {
    const [h, m, s] = parts.map(Number);
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts.map(Number);
    return m * 60 + s;
  }
  return 0;
}

export interface UseRecentResult {
  lectures: Episode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentPage: number;
}

export const useRecent = (
  initialParams: RecentLecturesParams = {},
): UseRecentResult => {
  const [lectures, setLectures] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialParams.page || 1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);
  const paramsRef = useRef(initialParams);
  const paramsKey = JSON.stringify(initialParams);

  useEffect(() => {
    paramsRef.current = initialParams;
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRecent = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (isLoadingRef.current) return;
      try {
        isLoadingRef.current = true;
        if (append) setIsLoadingMore(true);
        else setLoading(true);
        setError(null);

        const params = {
          ...paramsRef.current,
          page,
          limit: paramsRef.current.limit || 20,
        };
        const response = await recentApi.getRecentLectures(params);

        const transformed: Episode[] = response.data
          .filter((lecture) => {
            const audioSource =
              lecture.audio || lecture.mp3_url || lecture.AudioUrl;
            return Boolean(lecture.nid && lecture.Title && audioSource);
          })
          .map((lecture: SearchLecture) => {
            const anyLec = lecture as any;
            const reciterName =
              anyLec.reciter_name || anyLec.reciterName || undefined;
            return {
              id: lecture.nid!.toString(),
              title: lecture.Title!,
              durationSec: parseDuration(
                lecture.duration || lecture.mp3_duration || '0:00:00',
              ),
              coverUrl: lecture.img || lecture.CoverUrl || anyLec.lec_img || '',
              coverUrlLarge: anyLec.lec_img || undefined,
              audioUrl:
                lecture.audio || lecture.mp3_url || lecture.AudioUrl || '',
              seriesId: lecture.keyword || '',
              plays: parseInt(lecture.favorites?.toString() || '0') || 0,
              liked: false,
              language:
                lecture.lang || lecture.language || lecture.Language || '',
              downloads: parseInt(lecture.share?.toString() || '0') || 0,
              createdAt:
                lecture.created_at ||
                anyLec.post_date ||
                anyLec.updated_date ||
                '',
              lecturerName:
                pickSpeakerName([
                  lecture.lecturer_name,
                  lecture.rpname,
                  reciterName,
                  lecture.ResourcePerson,
                  anyLec.LecturerName,
                ]) || '',
              rpname: lecture.rpname,
              reciter_name: reciterName,
              isReciter: Boolean(anyLec.is_reciter),
            };
          });

        if (append) {
          setLectures((prev) => {
            const existing = new Set(prev.map((l) => l.id));
            const fresh = transformed.filter((l) => !existing.has(l.id));
            return [...prev, ...fresh];
          });
        } else {
          setLectures(transformed);
        }

        setHasMore(page < response.total_pages);
        setCurrentPage(page);
      } catch (err: any) {
        if (err instanceof ApiError && err.isCancelled) return;
        console.error('❌ Error fetching recent lectures:', err);
        setError(err.message || 'Failed to fetch recent lectures');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading || isLoadingRef.current) return;
    await fetchRecent(currentPage + 1, true);
  }, [hasMore, isLoadingMore, loading, currentPage, fetchRecent]);

  useEffect(() => {
    if (!initialParams || Object.keys(initialParams).length === 0) {
      logger.debug('useRecent: empty params, skipping fetch');
      setLoading(false);
      setHasMore(false);
      return;
    }
    fetchRecent(1, false);
  }, [paramsKey, fetchRecent]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(async () => {
    recentApi.clearCache();
    await fetchRecent(1, false);
  }, [fetchRecent]);

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
