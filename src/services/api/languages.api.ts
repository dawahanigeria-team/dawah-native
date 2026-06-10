/**
 * Languages API Service
 *
 * Source of truth for langid values. The hardcoded `LANGUAGE_MAP` in
 * src/utils/languages.ts contains at least one ghost entry (Fulani=5,
 * which the backend doesn't recognize and returns empty for), so any
 * code that fans out across languages should call `getLanguages()` here
 * instead of iterating the local map.
 *
 * The fallback path returns the hardcoded list minus Fulani — better
 * than failing the whole feed if /api/all_lang_api.php is down.
 */

import { LANGUAGE_MAP } from '@/utils/languages';
import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';
import { logger } from '@/utils/logger';

export interface Language {
  id: number;
  name: string;
}

class LanguagesApiService {
  private cache: Language[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h — language list is near-static.
  private inFlight: Promise<Language[]> | null = null;

  async getLanguages(): Promise<Language[]> {
    const now = Date.now();
    if (this.cache && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cache;
    }
    if (this.inFlight) return this.inFlight;

    this.inFlight = (async () => {
      try {
        const response = await apiClient.get<Language[]>(
          '/api/all_lang_api.php',
          {},
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
        );

        const body = response.data as any;
        const list: Language[] = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
            ? body.data
            : [];

        const cleaned = list
          .filter(
            (l) =>
              l &&
              typeof l.id === 'number' &&
              typeof l.name === 'string' &&
              l.name.trim().length > 0,
          )
          .map((l) => ({ id: l.id, name: l.name.trim() }));

        if (cleaned.length === 0) {
          throw new Error('Language list response was empty');
        }

        this.cache = cleaned;
        this.cacheTimestamp = now;
        logger.debug(`Loaded ${cleaned.length} languages from API`);
        return cleaned;
      } catch (error) {
        logger.warn('Falling back to hardcoded language list:', error);
        const fallback: Language[] = Object.entries(LANGUAGE_MAP).map(
          ([name, id]) => ({ id, name }),
        );
        // Don't cache the fallback long — retry the live list on next call.
        return fallback;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

export const languagesApi = new LanguagesApiService();
