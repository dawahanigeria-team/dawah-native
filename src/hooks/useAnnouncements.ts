/**
 * Custom hook for fetching announcements
 */

import { useState, useEffect, useCallback } from 'react';
import { announcementsApi, AnnouncementApiResponse } from '../services/api/announcements.api';
import { userService } from '../services/user.service';

export interface UseAnnouncementsResult {
  announcements: AnnouncementApiResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAnnouncements = (userIdParam?: string): UseAnnouncementsResult => {
  const [announcements, setAnnouncements] = useState<AnnouncementApiResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(userIdParam);

  // Fetch userId if not provided
  useEffect(() => {
    if (!userIdParam) {
      userService.getUserId().then(setUserId);
    }
  }, [userIdParam]);

  const fetchAnnouncements = useCallback(async () => {
    // Don't fetch until we have a userId
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await announcementsApi.getAnnouncements(userId);
      setAnnouncements(response.data);
      setUnreadCount(response.unread_count || 0);
    } catch (err: any) {
      console.error('❌ Error fetching announcements:', err);
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const refetch = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    unreadCount,
    loading,
    error,
    refetch,
  };
};

/**
 * Hook to get only unread count (lighter weight)
 * Fetches userId internally if not provided
 */
export const useUnreadAnnouncementsCount = (userIdParam?: string): number => {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | undefined>(userIdParam);

  // Fetch userId if not provided
  useEffect(() => {
    if (!userIdParam) {
      userService.getUserId().then(setUserId);
    }
  }, [userIdParam]);

  useEffect(() => {
    // Don't fetch until we have a userId
    if (!userId) return;

    const fetchCount = async () => {
      try {
        const unreadCount = await announcementsApi.getUnreadCount(userId);
        setCount(unreadCount);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchCount();

    // Refresh count every 5 minutes
    const interval = setInterval(fetchCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  return count;
};
