/**
 * Custom hook for fetching videos with pagination support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { videoApi, VideoListParams, VideoApiResponse } from '../services/api/video.api';
import { Video } from '../types/types';

export interface UseVideosResult {
  videos: Video[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoadingMore: boolean;
  currentPage: number;
}

export const useVideos = (initialParams: VideoListParams = {}): UseVideosResult => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialParams.page || 1);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);

  // Store initialParams in a ref to avoid re-creating fetchVideos on every render
  const paramsRef = useRef(initialParams);

  // Update ref if params change (though in practice they shouldn't)
  useEffect(() => {
    paramsRef.current = initialParams;
  }, [initialParams]);

  /**
   * Helper function to parse duration string to seconds
   */
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

  /**
   * Transform API response to Video type
   */
  const transformVideo = (apiVideo: VideoApiResponse): Video | null => {
    // Extract required fields with fallbacks
    const id = apiVideo.id || apiVideo.nid?.toString();
    const title = apiVideo.title || apiVideo.Title;

    // API can return either youtube_url or youtubekey
    const youtubeKey = apiVideo.youtubekey || apiVideo.youtube_id;
    const youtubeUrl = apiVideo.youtube_url || (youtubeKey ? `https://www.youtube.com/watch?v=${youtubeKey}` : undefined);

    // API returns 'images' field for thumbnail
    const thumbnail = apiVideo.images || apiVideo.thumbnail || apiVideo.img;

    // Validate required fields - we need either youtubeUrl or youtubeKey
    if (!id || !title || (!youtubeUrl && !youtubeKey)) {
      console.warn('⚠️ Skipping invalid video:', {
        id,
        title,
        youtubeUrl,
        youtubeKey,
      });
      return null;
    }

    // Extract YouTube ID - if we have youtubeKey directly, use it
    let youtubeId = youtubeKey;
    if (!youtubeId && youtubeUrl) {
      youtubeId = videoApi.extractYouTubeId(youtubeUrl);
    }

    if (!youtubeId) {
      console.warn('⚠️ Could not extract YouTube ID from URL:', youtubeUrl);
      return null;
    }

    // Parse duration
    const duration = apiVideo.duration || apiVideo.Duration || '0:00';
    const durationSec = parseDuration(duration);

    // Parse numeric fields
    const views = typeof apiVideo.views === 'number'
      ? apiVideo.views
      : parseInt(String(apiVideo.views || apiVideo.Plays || '0')) || 0;

    const likes = typeof apiVideo.likes === 'number'
      ? apiVideo.likes
      : parseInt(String(apiVideo.likes || apiVideo.favorites || '0')) || 0;

    return {
      id,
      title,
      youtubeUrl: youtubeUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
      youtubeId,
      thumbnailUrl: thumbnail || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
      description: apiVideo.description,
      duration,
      durationSec,
      views,
      likes,
      createdAt: apiVideo.created_at || apiVideo.CreatedAt || apiVideo.post_date || '',
      lecturerName: apiVideo.author || apiVideo.lecturer_name || apiVideo.rpname,
      language: apiVideo.language || apiVideo.lang,
    };
  };

  /**
   * Fetch videos from API
   * Wrapped in useCallback to prevent stale closures
   */
  const fetchVideos = useCallback(async (page: number = 1, append: boolean = false) => {
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
      console.log('🎥 Fetching videos with params:', params);

      const response = await videoApi.getVideos(params);

      console.log('✅ Videos fetched successfully:', {
        count: response.data.length,
        page: response.page,
        total: response.total,
      });

      // Transform and filter valid videos
      const transformedVideos: Video[] = response.data
        .map(transformVideo)
        .filter((video): video is Video => video !== null);

      console.log(`📊 Transformed ${response.data.length} API videos into ${transformedVideos.length} valid videos`);

      // Append or replace videos based on pagination
      if (append) {
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          const newVideos = transformedVideos.filter(v => !existingIds.has(v.id));

          if (newVideos.length === 0 && transformedVideos.length > 0) {
            console.warn('⚠️ All items were duplicates');
          }

          console.log(`📊 Loading more: Got ${transformedVideos.length} items, ${newVideos.length} are new, total now: ${prev.length + newVideos.length}`);
          return [...prev, ...newVideos];
        });
      } else {
        console.log(`📊 Initial load: Got ${transformedVideos.length} items`);
        setVideos(transformedVideos);
      }

      // Check if there are more pages
      const totalPages = response.total_pages;
      const hasMorePages = page < totalPages;

      console.log(`📊 Pagination status: Page ${page}/${totalPages}, Has more: ${hasMorePages}`);

      setHasMore(hasMorePages);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('❌ Error fetching videos:', err);
      setError(err.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, []); // Empty deps - uses refs for params

  /**
   * Load more function for infinite scroll
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;
    await fetchVideos(currentPage + 1, true);
  }, [hasMore, isLoadingMore, loading, currentPage, fetchVideos]);

  /**
   * Refetch function with cache clearing
   */
  const refetch = useCallback(async () => {
    await fetchVideos(1, false);
  }, [fetchVideos]);

  // Fetch initial data on mount
  useEffect(() => {
    console.log('🎯 useVideos mount - initialParams:', paramsRef.current);

    if (!paramsRef.current || Object.keys(paramsRef.current).length === 0) {
      console.log('⚠️ useVideos: No params provided, skipping fetch');
      setLoading(false);
      setHasMore(false);
      return;
    }

    console.log('✅ useVideos: Fetching initial data');
    fetchVideos(1, false);
  }, [fetchVideos]); // Only fetch when fetchVideos changes (which it won't due to empty deps)

  return {
    videos,
    loading,
    error,
    refetch,
    loadMore,
    hasMore,
    isLoadingMore,
    currentPage,
  };
};
