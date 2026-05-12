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
