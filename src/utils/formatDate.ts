/**
 * Date formatting helpers for lecture surfaces.
 *
 * The recent-lectures endpoint returns dates as
 *   "Tue, 2026/06/09 - 15:09"
 * The lecture-detail endpoint and others also send `created_at` /
 * `updated_date` / `post_date` in mixed formats. parseLectureDate()
 * accepts any of those and normalizes to a millisecond epoch (0 on
 * failure so callers can guard).
 */

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function parseLectureDate(raw: unknown): number {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  if (raw instanceof Date) return raw.getTime();
  const s = String(raw).trim();
  if (!s) return 0;

  // Strip leading weekday ("Tue, ") and normalize "/"→"-" and " - " separator
  // so Date.parse handles it on iOS + Android consistently.
  const normalized = s
    .replace(/^[A-Za-z]+,\s*/, '')
    .replace(/\s-\s/, ' ')
    .replace(/\//g, '-');
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Relative ("3d ago", "5w ago"), with absolute fallback after 6 months
 * because "47w ago" reads worse than "Jan 2026". Returns '' for unknown
 * dates so the caller can omit rendering instead of showing a placeholder.
 */
export function formatRelativeDate(raw: unknown, now: number = Date.now()): string {
  const t = parseLectureDate(raw);
  if (!t) return '';
  const diff = now - t;
  if (diff < 0) return ''; // future-dated rows shouldn't be labelled
  if (diff < MINUTE_MS) return 'just now';
  if (diff < HOUR_MS) {
    const m = Math.floor(diff / MINUTE_MS);
    return `${m}m ago`;
  }
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    return `${h}h ago`;
  }
  if (diff < 2 * DAY_MS) return 'yesterday';
  if (diff < WEEK_MS) {
    const d = Math.floor(diff / DAY_MS);
    return `${d}d ago`;
  }
  if (diff < 6 * MONTH_MS) {
    const w = Math.floor(diff / WEEK_MS);
    return `${w}w ago`;
  }
  const d = new Date(t);
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${month} ${d.getFullYear()}`;
}

/**
 * Absolute date for accessibility labels & long-press contexts.
 * Example: "9 June 2026".
 */
export function formatAbsoluteDate(raw: unknown): string {
  const t = parseLectureDate(raw);
  if (!t) return '';
  const d = new Date(t);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
