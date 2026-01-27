/**
 * Custom hook for fetching announcements
 */

import { useState, useEffect, useCallback } from 'react';
import { announcementsApi, AnnouncementApiResponse } from '../services/api/announcements.api';

export interface UseAnnouncementsResult {
  announcements: AnnouncementApiResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAnnouncements = (userId?: string): UseAnnouncementsResult => {
  const [announcements, setAnnouncements] = useState<AnnouncementApiResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
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
 */
export const useUnreadAnnouncementsCount = (userId?: string): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
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
