import type { AnnouncementApiResponse } from '../services/api/announcements.api';

const parseAnnouncementTimestamp = (value?: string): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const applyAnnouncementsCutoff = (
  announcements: AnnouncementApiResponse[],
  cutoffTimestamp?: number,
): AnnouncementApiResponse[] => {
  if (!cutoffTimestamp || !Number.isFinite(cutoffTimestamp)) {
    return announcements;
  }

  return announcements.filter((announcement) => {
    const createdAt = parseAnnouncementTimestamp(announcement.created_at);
    if (createdAt === null) {
      // Keep unknown dates to avoid hiding potentially important messages.
      return true;
    }
    return createdAt >= cutoffTimestamp;
  });
};

export const countUnreadAnnouncements = (
  announcements: AnnouncementApiResponse[],
): number => announcements.filter((announcement) => !announcement.read).length;

export const markAnnouncementAsReadLocally = (
  announcements: AnnouncementApiResponse[],
  announcementId: string,
): {
  announcements: AnnouncementApiResponse[];
  didMarkAsRead: boolean;
} => {
  let didMarkAsRead = false;

  const nextAnnouncements = announcements.map((announcement) => {
    if (announcement.id !== announcementId) {
      return announcement;
    }
    if (announcement.read) {
      return announcement;
    }
    didMarkAsRead = true;
    return { ...announcement, read: true };
  });

  if (!didMarkAsRead) {
    return { announcements, didMarkAsRead: false };
  }

  return {
    announcements: nextAnnouncements,
    didMarkAsRead: true,
  };
};

/** How long a published unread count may be reused before it is refetched. */
export const UNREAD_COUNT_TTL_MS = 5 * 60 * 1000;

/**
 * Whether a consumer can use the shared unread count instead of hitting the
 * network.
 *
 * Freshness is the whole point. The reuse check used to be `!== null` with no
 * expiry, which would have frozen the badge permanently the moment anything
 * published a count — so in practice it only ever "worked" because nothing on
 * the Home screen ever did, and every consumer fetched the full announcements
 * list instead.
 */
export const canReuseSharedCount = (
  count: number | null,
  publishedAt: number,
  now: number,
  ttlMs: number = UNREAD_COUNT_TTL_MS,
): boolean => count !== null && now - publishedAt < ttlMs;
