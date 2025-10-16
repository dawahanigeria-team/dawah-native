import { useCallback, useEffect, useRef, useState } from 'react';
import { lectureDetailApi } from '../services/api/lectureDetail.api';
import type { LectureDetail } from '../types/api.types';

export interface UseLectureDetailResult {
  lecture: LectureDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useLectureDetail = (lectureId?: string | number): UseLectureDetailResult => {
  const [lecture, setLecture] = useState<LectureDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(!!lectureId);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const currentRequestIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLecture = useCallback(
    async (id: string | number, useCache: boolean = true) => {
      if (!id) {
        setLecture(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        currentRequestIdRef.current = id;

        const detail = await lectureDetailApi.getLectureDetail({
          lectureId: id,
          useCache,
        });

        // Only update state if this response is for the latest request and the component is still mounted
        if (isMountedRef.current && currentRequestIdRef.current === id) {
          setLecture(detail);
        }
      } catch (err: any) {
        if (isMountedRef.current && currentRequestIdRef.current === id) {
          setError(err?.message || 'Failed to load lecture details');
          setLecture(null);
        }
      } finally {
        if (isMountedRef.current && currentRequestIdRef.current === id) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (lectureId) {
      fetchLecture(lectureId);
    } else {
      setLoading(false);
    }
  }, [lectureId, fetchLecture]);

  const refetch = useCallback(async () => {
    if (!lectureId) return;
    lectureDetailApi.clearCache(lectureId);
    await fetchLecture(lectureId, false);
  }, [lectureId, fetchLecture]);

  return {
    lecture,
    loading,
    error,
    refetch,
  };
};
