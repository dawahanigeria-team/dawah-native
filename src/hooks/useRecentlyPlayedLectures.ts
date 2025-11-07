import React, { useCallback, useEffect, useState } from "react";
import { historyService } from "../services/history.service";
import { Episode } from "../types/types";

interface UseRecentlyPlayedLecturesResult {
  lectures: Episode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useRecentlyPlayedLectures = (
  limit: number = 10
): UseRecentlyPlayedLecturesResult => {
  const [lectures, setLectures] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentlyPlayed = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const episodes = await historyService.getHistoryAsEpisodes();
      setLectures(episodes.slice(0, limit));
    } catch (err) {
      console.error("Failed to fetch recently played:", err);
      setError("Failed to load recently played lectures.");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentlyPlayed();
  }, [fetchRecentlyPlayed]);

  const refetch = useCallback(async () => {
    await fetchRecentlyPlayed();
  }, [fetchRecentlyPlayed]);

  return {
    lectures,
    loading,
    error,
    refetch,
  };
};
