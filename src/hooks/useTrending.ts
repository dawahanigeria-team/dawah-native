/**
 * Custom hook for fetching trending lectures
 */

import { useState, useEffect } from 'react';
import { trendingApi, TrendingLecturesParams } from '../services/api/trending.api';
import { SearchLecture } from '../types/api.types';
import { Episode } from '../types/types';

export interface UseTrendingResult {
  lectures: Episode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTrending = (params: TrendingLecturesParams = {}): UseTrendingResult => {
  const [lectures, setLectures] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔥 Fetching trending lectures with params:', params);
      const response = await trendingApi.getTrendingLectures(params);

      console.log('✅ Trending lectures fetched successfully:', {
        count: response.data.length,
        page: response.page,
        total: response.total
      });

      // Transform SearchLecture to Episode format
      const transformedLectures: Episode[] = response.data.map((lecture: SearchLecture) => ({
        id: lecture.nid?.toString() || lecture.id || '',
        title: lecture.Title || lecture.mp3_title || '',
        durationSec: parseDuration(lecture.duration || lecture.mp3_duration || '0:00:00'),
        coverUrl: lecture.img || lecture.CoverUrl || '',
        audioUrl: lecture.audio || lecture.mp3_url || lecture.AudioUrl || '',
        seriesId: lecture.keyword || '',
        plays: parseInt(lecture.favorites?.toString() || '0') || 0,
        liked: false, // Default to false
        language: lecture.lang || lecture.language || lecture.Language || '',
        downloads: parseInt(lecture.share?.toString() || '0') || 0,
        createdAt: lecture.created_at || '',
        lecturerName: lecture.rpname || lecture.lecturer_name || lecture.ResourcePerson || '',
      }));

      setLectures(transformedLectures);
    } catch (err: any) {
      console.error('❌ Error fetching trending lectures:', err);
      setError(err.message || 'Failed to fetch trending lectures');
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (params && Object.keys(params).length > 0) { // Only fetch if params are provided and not empty
      fetchTrending();
    } else {
      setLoading(false); // Set loading to false if not fetching
    }
  }, [JSON.stringify(params)]); // Re-fetch when params change

  return {
    lectures,
    loading,
    error,
    refetch: fetchTrending,
  };
};
