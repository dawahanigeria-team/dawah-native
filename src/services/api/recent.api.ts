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
 * native page-based pagination (30 items per page).
 *
 * We pull a small pool (POOL_PAGES × 30 items) into memory, cached for
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
}

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
const POOL_PAGES = 5; // 5 × 30 = ~150 lectures in the shared pool.
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

class RecentLecturesApiService {
  private pool: SearchLecture[] | null = null;
  private cacheTimestamp = 0;
  private inFlight: Promise<SearchLecture[]> | null = null;

  /**
   * Fetch POOL_PAGES pages from /api/leclisting_recent.php in parallel,
   * concat, dedupe by nid, sort newest-first as a defensive belt.
   * Cached for 5 minutes; concurrent callers share the in-flight promise.
   */
  private async fetchPool(): Promise<SearchLecture[]> {
    const now = Date.now();
    if (this.pool && now - this.cacheTimestamp < MERGED_CACHE_TTL_MS) {
      return this.pool;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      try {
        const pageNumbers = Array.from({ length: POOL_PAGES }, (_, i) => i + 1);
        logger.debug(
          `Fetching ${POOL_PAGES} pages from ${RECENT_ENDPOINT}?action=${RECENT_ACTION}`,
        );

        const results = await Promise.allSettled(
          pageNumbers.map((page) =>
            apiClient.get<any>(
              RECENT_ENDPOINT,
              { action: RECENT_ACTION, page },
              {
                // Home must fail fast enough to leave skeleton state and show
                // recovery UI. The base client default could otherwise keep a
                // cold launch waiting for roughly 90 seconds (3 × 30s).
                timeout: RECENT_REQUEST_TIMEOUT_MS,
                retryAttempts: 2,
                useCache: true,
                cacheTTL: API_CONFIG.CACHE.LECTURES_TTL,
                headers: {
                  Origin: API_CONFIG.ORIGIN,
                  Referer: API_CONFIG.REFERER,
                  'User-Agent': API_CONFIG.USER_AGENT,
                  'X-Project-Key': API_CONFIG.X_PROJECT_KEY,
                },
              },
            ),
          ),
        );

        const merged: SearchLecture[] = [];
        const seen = new Set<string | number>();
        let okPages = 0;

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status !== 'fulfilled') {
            logger.debug(
              `Recent page ${pageNumbers[i]} failed: ${(r as any).reason?.message || 'unknown'}`,
            );
            continue;
          }
          okPages++;
          for (const raw of extractItems(r.value.data)) {
            if (raw?.keyword === 'dn_quran') continue;
            const id = raw?.nid;
            if (id == null || seen.has(id)) continue;
            seen.add(id);
            merged.push(normalizeItem(raw));
          }
        }

        // Defensive sort — server already returns newest-first but pages
        // arrive concurrently, so concat order isn't guaranteed.
        merged.sort((a: any, b: any) => parsePostDate(b) - parsePostDate(a));

        logger.debug(
          `Recent pool: ${merged.length} unique items from ${okPages}/${POOL_PAGES} pages`,
        );

        // Promise.allSettled deliberately tolerates partial page failures, but
        // treating five failures as a successful empty catalog leaves the home
        // screen blank forever and gives callers no way to retry.
        if (okPages === 0) {
          const firstFailure = results.find(
            (result): result is PromiseRejectedResult => result.status === 'rejected',
          );
          throw firstFailure?.reason || new ApiError('Unable to load recent lectures');
        }

        this.pool = merged;
        this.cacheTimestamp = now;
        return merged;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
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
      const pool = await this.fetchPool();
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
      const pool = await this.fetchPool();
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

  clearCache(): void {
    this.pool = null;
    this.cacheTimestamp = 0;
    logger.debug('Recent/Trending lectures pool cleared');
  }
}

export const recentApi = new RecentLecturesApiService();
