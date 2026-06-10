/**
 * Recent / Trending Lectures API Service
 *
 * Single source for two related feeds:
 *   - getRecentLectures()   — newest first (Fresh Content, Featured hero)
 *   - getTrendingLectures() — highest-velocity within a recency window
 *                             (home "Trending Now" rail, /section/trending)
 *
 * Both feeds are computed from one merged dataset: a parallel fan-out
 * across every real langid returned by /api/all_lang_api.php. This
 * replaces /api/popular_lec_api.php for trending — that endpoint has no
 * date field, so it cannot express "trending now" and was returning
 * lifetime-popular content (e.g. Ramadan lectures from 3 months ago
 * still ranking first in June).
 */

import { SearchLecture } from '../../types/api.types';
import { API_CONFIG } from '../config/api.config';
import { apiClient, ApiError } from './base.api';
import { logger } from '@/utils/logger';
import { languagesApi } from './languages.api';

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
const TRENDING_WINDOW_DAYS = 90; // "Trending" = posted within the last 90 days.
const PER_LANG_FETCH_LIMIT = 30; // Per-langid request size — small payload, parallel.
const MERGED_CACHE_TTL_MS = 5 * 60 * 1000;

// post_date format on /api/leclistingapi.php: "Thu, 2026/05/28 - 06:52"
function parsePostDate(item: any): number {
  const raw = item?.post_date || item?.updated_date || item?.created_at || '';
  const normalized = String(raw)
    .replace(/^[A-Za-z]+,\s*/, '')
    .replace(/\s-\s/, ' ')
    .replace(/\//g, '-');
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

class RecentLecturesApiService {
  private mergedCache: SearchLecture[] | null = null;
  private cacheTimestamp = 0;
  private inFlight: Promise<SearchLecture[]> | null = null;

  /**
   * Fetch /api/leclistingapi.php in parallel for every real langid,
   * merge, dedupe by nid, sort newest-first. Cached for 5 minutes;
   * concurrent callers share the in-flight promise.
   */
  private async fetchAllMerged(): Promise<SearchLecture[]> {
    const now = Date.now();
    if (this.mergedCache && now - this.cacheTimestamp < MERGED_CACHE_TTL_MS) {
      return this.mergedCache;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      try {
        const languages = await languagesApi.getLanguages();
        logger.debug(
          `Fanning out recent lectures across ${languages.length} langids`,
        );

        const results = await Promise.allSettled(
          languages.map((lang) =>
            apiClient.get<any>(
              '/api/leclistingapi.php',
              { langid: lang.id, lim: PER_LANG_FETCH_LIMIT },
              {
                timeout: API_CONFIG.TIMEOUTS.DEFAULT,
                useCache: false,
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
        let okCount = 0;

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status !== 'fulfilled') {
            logger.debug(
              `Lang fan-out failed for ${languages[i].name}: ${(r as any).reason?.message || 'unknown'}`,
            );
            continue;
          }
          okCount++;
          for (const item of extractItems(r.value.data)) {
            if (item?.keyword === 'dn_quran') continue; // Quran has its own surface.
            const id = item?.nid;
            if (id == null || seen.has(id)) continue;
            seen.add(id);
            merged.push(item);
          }
        }

        merged.sort((a: any, b: any) => parsePostDate(b) - parsePostDate(a));

        logger.debug(
          `Merged ${merged.length} lectures from ${okCount}/${languages.length} langs (newest first)`,
        );

        this.mergedCache = merged;
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
      const all = await this.fetchAllMerged();
      return this.paginate(all, params);
    } catch (error) {
      console.error('❌ Recent Lectures API Error:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch recent lectures', undefined, error);
    }
  }

  /**
   * "Trending" = views-per-day score among lectures posted within
   * TRENDING_WINDOW_DAYS. Velocity beats raw views so a 14-day-old
   * lecture with 1k views ranks above a 90-day-old lecture with 1k.
   */
  async getTrendingLectures(
    params: RecentLecturesParams = {},
  ): Promise<RecentLecturesResponse> {
    try {
      const all = await this.fetchAllMerged();
      const now = Date.now();
      const cutoff = now - TRENDING_WINDOW_DAYS * DAY_MS;

      const scored = all
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
    this.mergedCache = null;
    this.cacheTimestamp = 0;
    logger.debug('Recent/Trending lectures cache cleared');
  }
}

export const recentApi = new RecentLecturesApiService();
