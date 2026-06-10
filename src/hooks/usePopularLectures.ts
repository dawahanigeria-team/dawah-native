/**
 * Custom hook for fetching popular lectures
 */

import { useCallback, useEffect, useState } from 'react';
import { popularApi } from '../services/api/popular.api';
import { SearchLecture } from '../types/api.types';
import { Episode } from '../types/types';
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

export function usePopularLectures(limit = 10) {
  const [lectures, setLectures] = useState<SearchLecture[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Convert API lecture to Episode format
   */
  const convertToEpisode = useCallback((lecture: SearchLecture): Episode => {
    const parseDuration = (duration: string | undefined): number => {
      if (!duration) return 0;
      const parts = duration.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    };

    // Support multiple API field formats (popular lectures, search, legacy)
    const id = String(lecture.nid || lecture.id || `lecture-${Date.now()}`);
    const title = lecture.Title || lecture.mp3_title || "Untitled Lecture";
    const duration = lecture.duration || lecture.mp3_duration || lecture.Duration;
    const audioUrl = lecture.audio || lecture.mp3_url || lecture.AudioUrl || '';
    const coverUrl = lecture.img || lecture.lecturer_image || lecture.CoverUrl || '';
    const plays = parseInt(String(lecture.views || lecture.Plays || "0")) || 0;
    const language = lecture.lang || lecture.language || lecture.Language || "Unknown";
    const downloads = parseInt(String(lecture.downloads || lecture.Downloads || "0")) || 0;
    const createdAt = lecture.created_at || lecture.CreatedAt || new Date().toISOString();
    const reciterName = (lecture as SearchLecture & { reciter_name?: string; reciterName?: string }).reciter_name
      || (lecture as SearchLecture & { reciter_name?: string; reciterName?: string }).reciterName
      || (lecture as any).reciter_name
      || undefined;
    const lecturerName = pickSpeakerName([
      lecture.lecturer_name,
      lecture.rpname,
      reciterName,
      (lecture as any).LecturerName,
      lecture.ResourcePerson,
    ]);

    return {
      id,
      title,
      durationSec: parseDuration(duration),
      coverUrl,
      audioUrl,
      seriesId: '', // Popular lectures might not have series
      plays,
      liked: false,
      language,
      downloads,
      createdAt,
      lecturerName,
      rpname: lecture.rpname,
      reciter_name: reciterName,
      isReciter: Boolean((lecture as SearchLecture & { is_reciter?: boolean }).is_reciter),
    };
  }, []);

  /**
   * Fetch popular lectures
   */
  const fetchPopularLectures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const lecturesData = await popularApi.getPopularForCarousel(limit);

      logger.debug(`Fetched ${lecturesData.length} popular lectures`);

      setLectures(lecturesData);

      // Convert to episodes for the carousel
      const episodeData = lecturesData.map(convertToEpisode);
      setEpisodes(episodeData);
    } catch (err) {
      console.error('Failed to fetch popular lectures:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch popular lectures'));

      // Return empty arrays on error
      setLectures([]);
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, [limit, convertToEpisode]);

  /**
   * Fetch on mount
   */
  useEffect(() => {
    fetchPopularLectures();
  }, [fetchPopularLectures]);

  /**
   * Refresh function
   */
  const refresh = useCallback(() => {
    fetchPopularLectures();
  }, [fetchPopularLectures]);

  return {
    lectures,
    episodes,
    loading,
    error,
    refresh,
  };
}
