/**
 * Recent / Trending Lectures API Service
 *
 * Single source for two related feeds:
 *   - getRecentLectures()   — newest-first (Fresh Content, Featured hero,
 *                             /section/recently-posted)
 *   - getTrendingLectures() — velocity-scored within a recency window
 *                             (home "Trending Now" rail, /section/trending)
 *
 * Both feeds are computed from one shared pool fetched from
 *   /api/leclisting_recent.php?action=get_recent_audio
 * — the same endpoint the dawahnigeria.com web app uses for its
 * "recently posted lectures" surface. The backend returns items
 * server-sorted by updated_date desc, mixed across all languages, with
 * native page-based pagination (30 items by default, up to 150 on request).
 *
 * We pull a small pool (POOL_SIZE items) into memory, cached for
 * 5 minutes, so the same fetch backs both feeds without duplicating
 * work. The previous /api/popular_lec_api.php source had no date field
 * and surfaced years-old content — abandoned.
 */

import { SearchLecture } from '../../types/api.types';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { logger } from '@/utils/logger';

export interface RecentLecturesParams {
  page?: number;
  limit?: number;
  languageIds?: number[];
  lecturerIds?: number[];
}

type FeedPreferenceFilter = Pick<
  RecentLecturesParams,
  'languageIds' | 'lecturerIds'
>;

export interface RecentLecturesResponse {
  success: boolean;
  data: SearchLecture[];
  page: number;
  total: number;
  total_pages: number;
  per_page: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const TRENDING_WINDOW_DAYS = 90;
const POOL_SIZE = 150;
const FIRST_PAGE_SIZE = 30;

/**
 * How long a fetched page stays usable from the persistent cache.
 *
 * These five pages are ~44 KB each — 218 KB measured — and they are fetched on
 * every cold launch to render a 20-item rail. They inherited the shared
 * LECTURES_TTL of 10 minutes, which is far tighter than the data: this endpoint
 * lists recently *posted* lectures, and new lectures arrive on the order of once
 * a day, not once every ten minutes. Any launch more than 10 minutes after the
 * last one therefore re-downloaded all 218 KB to arrive at the same answer, on
 * an audience largely paying for mobile data.
 *
 * An hour still surfaces new lectures well within the day they appear, and the
 * home rail renders immediately from its own 7-day persisted cache regardless,
 * so this only governs how often the pool behind it is refreshed.
 *
 * Deliberately local rather than raising API_CONFIG.CACHE.LECTURES_TTL, which
 * lecturers, albums and categories also read.
 */
const RECENT_POOL_CACHE_TTL_S = 60 * 60;
const RECENT_REQUEST_TIMEOUT_MS = 12000;
const MERGED_CACHE_TTL_MS = 5 * 60 * 1000;
const RECENT_ENDPOINT = '/api/leclisting_recent.php';
const RECENT_ACTION = 'get_recent_audio';

// updated_date format: "Tue, 2026/06/09 - 15:09" (also matches post_date elsewhere).
function parsePostDate(item: any): number {
  const raw =
    item?.updated_date || item?.post_date || item?.created_at || '';
  const normalized = String(raw)
    .replace(/^[A-Za-z]+,\s*/, '')
    .replace(/\s-\s/, ' ')
    .replace(/\//g, '-');
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

/**
 * leclisting_recent returns mp3_title / mp3_url / mp3_duration /
 * updated_date instead of Title / audio / duration / post_date. Map them
 * onto the canonical fields so downstream transforms (useRecent etc.)
 * don't have to know which endpoint produced the row.
 */
function normalizeItem(raw: any): SearchLecture {
  const item: any = { ...raw };
  if (!item.Title && item.mp3_title) item.Title = item.mp3_title;
  if (!item.audio && item.mp3_url) item.audio = item.mp3_url;
  if (!item.duration && item.mp3_duration) item.duration = item.mp3_duration;
  if (!item.post_date && item.updated_date) item.post_date = item.updated_date;
  if (!item.img && item.lec_img) item.img = item.lec_img;
  if (item.lang_id != null && item.langid == null) item.langid = item.lang_id;
  return item as SearchLecture;
}

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

interface RecentSnapshot {
  raw: any[];
  pool: SearchLecture[];
  at: number;
}

class RecentLecturesApiService {
  private snapshot: RecentSnapshot | null = null;
  private snapshotInFlight: Promise<RecentSnapshot> | null = null;
  private activeFilterKey = 'all';

  private preferenceFilter(params: RecentLecturesParams): FeedPreferenceFilter {
    return {
      languageIds: params.languageIds?.filter((id) => id > 0) ?? [],
      lecturerIds: params.lecturerIds?.filter((id) => id > 0) ?? [],
    };
  }

  private filterKey(filter: FeedPreferenceFilter): string {
    const languages = [...(filter.languageIds ?? [])].sort((a, b) => a - b);
    const lecturers = [...(filter.lecturerIds ?? [])].sort((a, b) => a - b);
    return `l:${languages.join(',')}|r:${lecturers.join(',')}`;
  }

  private activateFilter(filter: FeedPreferenceFilter): void {
    const key = this.filterKey(filter);
    if (key === this.activeFilterKey) return;
    this.clearCache();
    this.activeFilterKey = key;
  }

  private async fetchRaw(
    filter: FeedPreferenceFilter,
    limit: number,
  ): Promise<any[]> {
    const response = await apiClient.get<any>(
      RECENT_ENDPOINT,
      {
        action: RECENT_ACTION,
        page: 1,
        limit,
        language_ids: filter.languageIds?.join(',') || undefined,
        lecturer_ids: filter.lecturerIds?.join(',') || undefined,
      },
      {
        timeout: RECENT_REQUEST_TIMEOUT_MS,
        retryAttempts: 2,
        useCache: true,
        cacheTTL: RECENT_POOL_CACHE_TTL_S,
        headers: {
          Origin: API_CONFIG.ORIGIN,
          Referer: API_CONFIG.REFERER,
          'User-Agent': API_CONFIG.USER_AGENT,
          'X-Project-Key': API_CONFIG.X_PROJECT_KEY,
        },
      },
    );

    return extractItems(response.data);
  }

  private toLectures(raw: any[]): SearchLecture[] {
    return raw.filter((item) => item?.keyword !== 'dn_quran').map(normalizeItem);
  }

  /**
   * One request feeds both the newest-first list and the trending pool. The
   * server returns newest-first, so the first FIRST_PAGE_SIZE rows of the pool
   * request are the rows a separate limit=30 request would have returned.
   * Cached for 5 minutes; concurrent callers share the in-flight promise.
   */
  private async fetchSnapshot(
    filter: FeedPreferenceFilter,
  ): Promise<RecentSnapshot> {
    const now = Date.now();
    if (this.snapshot && now - this.snapshot.at < MERGED_CACHE_TTL_MS) {
      return this.snapshot;
    }
    if (this.snapshotInFlight) return this.snapshotInFlight;

    this.snapshotInFlight = (async () => {
      try {
        logger.debug(
          `Fetching ${POOL_SIZE} items from ${RECENT_ENDPOINT}?action=${RECENT_ACTION}`,
        );

        const raw = await this.fetchRaw(filter, POOL_SIZE);
        const seen = new Set<string | number>();
        const pool = this.toLectures(raw).filter((item) => {
          const id = (item as any)?.nid;
          if (id == null || seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        // Defensive sort. The server already returns newest-first.
        pool.sort((a: any, b: any) => parsePostDate(b) - parsePostDate(a));

        logger.debug(`Recent pool: ${pool.length} unique items from one request`);

        this.snapshot = { raw, pool, at: now };
        return this.snapshot;
      } finally {
        this.snapshotInFlight = null;
      }
    })();

    return this.snapshotInFlight;
  }

  private async fetchFirstPage(
    filter: FeedPreferenceFilter,
  ): Promise<SearchLecture[]> {
    const { raw } = await this.fetchSnapshot(filter);
    return this.toLectures(raw.slice(0, FIRST_PAGE_SIZE));
  }

  private async fetchPool(filter: FeedPreferenceFilter): Promise<SearchLecture[]> {
    return (await this.fetchSnapshot(filter)).pool;
  }

  private paginate(
    source: SearchLecture[],
    params: RecentLecturesParams,
  ): RecentLecturesResponse {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return {
      success: true,
      data: source.slice(startIndex, endIndex),
      page,
      total: source.length,
      total_pages: Math.max(1, Math.ceil(source.length / limit)),
      per_page: limit,
    };
  }

  async getRecentLectures(
    params: RecentLecturesParams = {},
  ): Promise<RecentLecturesResponse> {
    try {
      const filter = this.preferenceFilter(params);
      this.activateFilter(filter);
      // Page one powers the home hero and Fresh Content. Do not make it wait
      // for the additional pages needed only for trending rank quality.
      if ((params.page || 1) === 1 && (params.limit || 20) <= 30) {
        const firstPage = await this.fetchFirstPage(filter);
        return this.paginate(firstPage, params);
      }
      const pool = await this.fetchPool(filter);
      return this.paginate(pool, params);
    } catch (error) {
      console.error('❌ Recent Lectures API Error:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch recent lectures', undefined, error);
    }
  }

  /**
   * Trending = views-per-day among lectures posted within
   * TRENDING_WINDOW_DAYS. Velocity beats raw views so a 14-day-old
   * lecture with 1k views ranks above a 90-day-old one with 1k.
   */
  async getTrendingLectures(
    params: RecentLecturesParams = {},
  ): Promise<RecentLecturesResponse> {
    try {
      const filter = this.preferenceFilter(params);
      this.activateFilter(filter);
      const pool = await this.fetchPool(filter);
      const now = Date.now();
      const cutoff = now - TRENDING_WINDOW_DAYS * DAY_MS;

      const scored = pool
        .map((item) => {
          const t = parsePostDate(item);
          if (!t || t < cutoff) return null;
          const ageDays = Math.max(1, (now - t) / DAY_MS);
          const views = Number((item as any)?.views) || 0;
          return { item, score: views / ageDays };
        })
        .filter((x): x is { item: SearchLecture; score: number } => x !== null)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item);

      logger.debug(
        `Trending: ${scored.length} lectures in last ${TRENDING_WINDOW_DAYS}d`,
      );

      return this.paginate(scored, params);
    } catch (error) {
      console.error('❌ Trending Lectures API Error:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch trending lectures', undefined, error);
    }
  }

  /**
   * Drop the in-memory pool. Enough for a filter change, because the persisted
   * page entries are keyed by URL and the filter is part of the query string,
   * so a different filter never reads another filter's cache.
   *
   * NOT enough for a user-initiated refresh — see clearPersistentCache.
   */
  clearCache(): void {
    this.snapshot = null;
    logger.debug('Recent/Trending lectures pool cleared');
  }

  /**
   * Also drop the persisted page entries, so the next fetch really does reach
   * the network.
   *
   * A refresh that clears only the in-memory pool re-runs fetchRaw, which asks
   * apiClient with useCache: true and is handed back the very pages we were
   * trying to get past — the user pulls to refresh and is shown the same
   * content. That was survivable while these pages expired after 10 minutes; at
   * an hour it would have made the refresh button look broken.
   *
   * Await this before refetching: the purge is async, and a refetch started
   * alongside it can still read the entry being removed.
   */
  async clearPersistentCache(): Promise<void> {
    this.clearCache();
    await apiClient.clearCache(RECENT_ENDPOINT);
    logger.debug('Recent/Trending persisted pages cleared');
  }
}

export const recentApi = new RecentLecturesApiService();
