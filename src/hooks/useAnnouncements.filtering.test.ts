import type { AnnouncementApiResponse } from '../services/api/announcements.api';
import {
  applyAnnouncementsCutoff,
  countUnreadAnnouncements,
  markAnnouncementAsReadLocally,
} from './useAnnouncements.filtering';

const buildAnnouncement = (
  id: string,
  createdAt: string,
  read: boolean = false,
): AnnouncementApiResponse => ({
  id,
  title: `Title ${id}`,
  message: `Message ${id}`,
  created_at: createdAt,
  read,
});

describe('useAnnouncements filtering', () => {
  test('filters out announcements older than cutoff timestamp', () => {
    const cutoff = Date.parse('2026-02-20T00:00:00.000Z');
    const announcements = [
      buildAnnouncement('old', '2026-02-10T12:00:00.000Z'),
      buildAnnouncement('new', '2026-02-21T12:00:00.000Z'),
    ];

    const filtered = applyAnnouncementsCutoff(announcements, cutoff);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('new');
  });

  test('keeps announcements with invalid dates to avoid accidental data loss', () => {
    const cutoff = Date.parse('2026-02-20T00:00:00.000Z');
    const announcements = [
      buildAnnouncement('invalid', 'not-a-date'),
      buildAnnouncement('new', '2026-02-21T12:00:00.000Z'),
    ];

    const filtered = applyAnnouncementsCutoff(announcements, cutoff);

    expect(filtered.map((item) => item.id)).toEqual(['invalid', 'new']);
  });

  test('returns original announcements when cutoff is missing', () => {
    const announcements = [
      buildAnnouncement('a', '2026-02-01T12:00:00.000Z'),
      buildAnnouncement('b', '2026-02-21T12:00:00.000Z'),
    ];

    const filtered = applyAnnouncementsCutoff(announcements, undefined);

    expect(filtered).toHaveLength(2);
  });

  test('counts unread announcements correctly after filtering', () => {
    const cutoff = Date.parse('2026-02-20T00:00:00.000Z');
    const announcements = [
      buildAnnouncement('old-unread', '2026-02-10T12:00:00.000Z', false),
      buildAnnouncement('new-unread', '2026-02-21T12:00:00.000Z', false),
      buildAnnouncement('new-read', '2026-02-21T13:00:00.000Z', true),
    ];

    const filtered = applyAnnouncementsCutoff(announcements, cutoff);
    const unread = countUnreadAnnouncements(filtered);

    expect(unread).toBe(1);
  });

  test('marks a specific unread announcement as read only once', () => {
    const initial = [
      buildAnnouncement('a', '2026-02-21T12:00:00.000Z', false),
      buildAnnouncement('b', '2026-02-21T13:00:00.000Z', true),
    ];

    const first = markAnnouncementAsReadLocally(initial, 'a');
    expect(first.didMarkAsRead).toBe(true);
    expect(first.announcements.find((item) => item.id === 'a')?.read).toBe(true);

    const second = markAnnouncementAsReadLocally(first.announcements, 'a');
    expect(second.didMarkAsRead).toBe(false);
    expect(second.announcements).toBe(first.announcements);
  });

  test('returns original list when announcement is missing', () => {
    const initial = [buildAnnouncement('a', '2026-02-21T12:00:00.000Z', false)];
    const result = markAnnouncementAsReadLocally(initial, 'missing');

    expect(result.didMarkAsRead).toBe(false);
    expect(result.announcements).toBe(initial);
  });
});
