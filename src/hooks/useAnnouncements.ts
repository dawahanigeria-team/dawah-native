/**
 * Custom hook for fetching announcements
 * Supports both authenticated users (server-side read tracking) 
 * and guest users (local read tracking via AsyncStorage)
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { announcementsApi, AnnouncementApiResponse } from '../services/api/announcements.api';
import { useAuthStore } from '../stores';

const GUEST_READ_ANNOUNCEMENTS_KEY = 'guest_read_announcements';
type UnreadCountListener = (count: number) => void;
const unreadCountListeners = new Set<UnreadCountListener>();
let sharedUnreadCount: number | null = null;

const publishUnreadCount = (count: number): void => {
  sharedUnreadCount = count;
  unreadCountListeners.forEach((listener) => listener(count));
};

const subscribeUnreadCount = (listener: UnreadCountListener): (() => void) => {
  unreadCountListeners.add(listener);
  if (sharedUnreadCount !== null) {
    listener(sharedUnreadCount);
  }
  return () => {
    unreadCountListeners.delete(listener);
  };
};

export interface UseAnnouncementsResult {
  announcements: AnnouncementApiResponse[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (announcementId: string) => Promise<void>;
}

/**
 * Check if user is authenticated with a real numeric user ID
 */
const isAuthenticatedUser = (userId: string | undefined): boolean => {
  if (!userId) return false;
  // Guest IDs start with "guest_" - not authenticated
  if (userId.startsWith('guest_')) return false;
  // Check if it's a numeric ID (real user)
  return /^\d+$/.test(userId);
};

/**
 * Get locally stored read announcement IDs for guests
 */
const getGuestReadIds = async (): Promise<Set<string>> => {
  try {
    const stored = await AsyncStorage.getItem(GUEST_READ_ANNOUNCEMENTS_KEY);
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      return new Set(ids);
    }
  } catch (error) {
    console.error('Failed to get guest read announcements:', error);
  }
  return new Set();
};

/**
 * Save read announcement ID for guests locally
 */
const saveGuestReadId = async (announcementId: string): Promise<void> => {
  try {
    const readIds = await getGuestReadIds();
    readIds.add(announcementId);
    // Keep only last 100 read IDs to prevent unlimited growth
    const idsArray = Array.from(readIds).slice(-100);
    await AsyncStorage.setItem(GUEST_READ_ANNOUNCEMENTS_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('Failed to save guest read announcement:', error);
  }
};

export const useAnnouncements = (userIdParam?: string): UseAnnouncementsResult => {
  const [announcements, setAnnouncements] = useState<AnnouncementApiResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get authenticated user from auth store
  const { user: authUser } = useAuthStore();
  const userId = userIdParam || authUser?.id;
  const isAuthenticated = isAuthenticatedUser(userId);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch announcements - pass userId only if authenticated
      const response = await announcementsApi.getAnnouncements(
        isAuthenticated ? userId : undefined
      );
      
      let fetchedAnnouncements = response.data;
      let calculatedUnreadCount = response.unread_count || 0;

      // For guests, calculate unread count locally
      if (!isAuthenticated) {
        const readIds = await getGuestReadIds();
        
        // Mark announcements as read based on local storage
        fetchedAnnouncements = fetchedAnnouncements.map(a => ({
          ...a,
          read: readIds.has(a.id),
        }));
        
        // Calculate unread count for guests
        calculatedUnreadCount = fetchedAnnouncements.filter(a => !a.read).length;
      }

      setAnnouncements(fetchedAnnouncements);
      setUnreadCount(calculatedUnreadCount);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch announcements';
      console.error('❌ Error fetching announcements:', errorMessage);
      setError(errorMessage);
      setAnnouncements([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Publish unread updates after commit to avoid setState during render warnings.
  useEffect(() => {
    publishUnreadCount(unreadCount);
  }, [unreadCount]);

  const refetch = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = useCallback(async (announcementId: string) => {
    // Check if announcement exists and is currently unread
    const announcement = announcements.find(a => a.id === announcementId);
    const wasUnread = announcement && !announcement.read;

    // Update local state immediately for responsive UI.
    if (announcement) {
      setAnnouncements(prev => 
        prev.map(a => a.id === announcementId ? { ...a, read: true } : a)
      );
      // Only decrement if it was previously unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }

    if (isAuthenticated && userId) {
      // For authenticated users, sync to server in the background.
      try {
        await announcementsApi.markAsRead(announcementId, userId);
      } catch (error) {
        console.error('Failed to mark as read on server:', error);
      }
    } else {
      // For guests, persist local read state.
      await saveGuestReadId(announcementId);
    }
  }, [isAuthenticated, userId, announcements]);

  return {
    announcements,
    unreadCount,
    loading,
    error,
    refetch,
    markAsRead,
  };
};

/**
 * Hook to get only unread count (lighter weight)
 * Works for both authenticated users and guests
 */
export const useUnreadAnnouncementsCount = (userIdParam?: string): number => {
  const [count, setCount] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  
  // Get authenticated user from auth store
  const { user: authUser } = useAuthStore();
  const userId = userIdParam || authUser?.id;
  const isAuthenticated = isAuthenticatedUser(userId);

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const setCountSafely = (nextCount: number) => {
      if (isMounted) {
        setCount(nextCount);
      }
    };

    const fetchCount = async () => {
      if (appStateRef.current !== 'active') {
        return;
      }

      try {
        if (isAuthenticated && userId) {
          // For authenticated users, get count from server
          const unreadCount = await announcementsApi.getUnreadCount(userId);
          setCountSafely(unreadCount);
        } else {
          // For guests, fetch announcements and calculate locally
          const response = await announcementsApi.getAnnouncements();
          const readIds = await getGuestReadIds();
          const unreadCount = response.data.filter(a => !readIds.has(a.id)).length;
          setCountSafely(unreadCount);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch unread count:', err);
        setCountSafely(0);
      }
    };

    const startPolling = () => {
      if (interval) return;
      interval = setInterval(() => {
        void fetchCount();
      }, 5 * 60 * 1000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    void fetchCount();
    startPolling();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        void fetchCount();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      isMounted = false;
      stopPolling();
      appStateSubscription.remove();
    };
  }, [userId, isAuthenticated]);

  useEffect(() => {
    return subscribeUnreadCount(setCount);
  }, []);

  return count;
};
