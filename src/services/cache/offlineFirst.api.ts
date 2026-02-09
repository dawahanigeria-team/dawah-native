/**
 * Offline-First API Wrapper
 * Automatically caches API responses and serves from cache when offline
 *
 * Strategy:
 * 1. Check cache first (memory → storage)
 * 2. If cache hit and valid → return cached data
 * 3. If online → fetch from API and update cache
 * 4. If offline and no cache → return error
 */

import { apiClient } from '../api/base.api';
import { cacheService, CACHE_CONFIG } from './cache.service';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';
import { logger } from '@/utils/logger';

export interface OfflineApiOptions {
  /**
   * Cache key for this request
   */
  cacheKey?: string;

  /**
   * TTL in seconds
   */
  ttl?: number;

  /**
   * Force fresh fetch (bypass cache)
   */
  forceFresh?: boolean;

  /**
   * Allow stale data if offline
   */
  allowStale?: boolean;
}

class OfflineFirstApi {
  private static instance: OfflineFirstApi;

  // Track active background refresh requests to prevent duplicates
  private activeRefreshes: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): OfflineFirstApi {
    if (!OfflineFirstApi.instance) {
      OfflineFirstApi.instance = new OfflineFirstApi();
    }
    return OfflineFirstApi.instance;
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      // Try a simple HEAD request to check connectivity
      const response = await fetch('https://backend.dawahbox.com/health', {
        method: 'HEAD',
        timeout: 3000,
      } as any);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * GET request with offline-first strategy
   */
  public async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options: OfflineApiOptions = {}
  ): Promise<T> {
    const {
      cacheKey = this.buildCacheKey('GET', endpoint, params),
      ttl = CACHE_CONFIG.TTL.LECTURES,
      forceFresh = false,
      allowStale = true,
    } = options;

    try {
      // Step 1: Try cache first (unless forceFresh)
      if (!forceFresh) {
        const cachedData = await cacheService.get<T>(cacheKey);
        if (cachedData) {
          logger.debug(`Offline-First: Serving from cache: ${endpoint}`);
          addSentryBreadcrumb(`Cache served: ${endpoint}`, 'api', { cacheKey });

          // Return cached data and fetch fresh in background
          this.refreshInBackground(endpoint, params, cacheKey, ttl);

          return cachedData;
        }
      }

      // Step 2: Fetch from API (let the request itself determine connectivity)
      logger.debug(`Offline-First: Fetching from API: ${endpoint}`);
      const response = await apiClient.get<T>(endpoint, params);

      // Step 4: Cache the response
      await cacheService.set(cacheKey, response.data, ttl);

      return response.data;
    } catch (error: any) {
      console.error(`Offline-First GET error for ${endpoint}:`, error);

      // If error and allowStale, try to return stale data
      if (allowStale) {
        const staleData = await cacheService.get<T>(cacheKey);
        if (staleData) {
          logger.debug(`Offline-First: Returning stale cache after error: ${endpoint}`);
          addSentryBreadcrumb(`Stale cache served (error): ${endpoint}`, 'api', {
            cacheKey,
            error: error.message,
          });
          return staleData;
        }
      }

      captureSentryException(error, {
        operation: 'offline_first_get',
        endpoint,
        cacheKey,
        online: await this.isOnline(),
      });

      throw error;
    }
  }

  /**
   * Refresh cache in background (don't wait for response)
   * Implements request deduplication to prevent multiple simultaneous refreshes
   */
  private async refreshInBackground(
    endpoint: string,
    params: Record<string, any> | undefined,
    cacheKey: string,
    ttl: number
  ): Promise<void> {
    // Check if already refreshing this cache key
    if (this.activeRefreshes.has(cacheKey)) {
      logger.debug(`Skipping background refresh (already in progress): ${endpoint}`);
      return;
    }

    try {
      // Mark as active
      this.activeRefreshes.add(cacheKey);

      // Don't await - run in background
      apiClient.get(endpoint, params).then(async (response) => {
        await cacheService.set(cacheKey, response.data, ttl);
        logger.debug(`Background refresh complete: ${endpoint}`);
        this.activeRefreshes.delete(cacheKey);
      }).catch((err) => {
        // Silently fail background refresh
        logger.debug(`Background refresh failed: ${endpoint}`, err.message);
        this.activeRefreshes.delete(cacheKey);
      });
    } catch {
      // Ignore background refresh errors
      this.activeRefreshes.delete(cacheKey);
    }
  }

  /**
   * Build cache key from request parameters
   */
  private buildCacheKey(method: string, endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    const hash = this.simpleHash(endpoint + paramString);
    return `cache_api_${method}_${hash}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Warm up cache with essential data
   * Each call is wrapped independently so one failure doesn't block others
   */
  public async warmupEssentialData(): Promise<void> {
    logger.debug('Warming up essential data...');

    // Fetch and cache popular lectures
    // Uses the same endpoint as usePopularLecturesWithCache hook
    try {
      await this.get(
        '/api/popular_lec_api.php',
        { limit: CACHE_CONFIG.LIMITS.POPULAR_LECTURES },
        {
          cacheKey: CACHE_CONFIG.KEYS.POPULAR_LECTURES,
          ttl: CACHE_CONFIG.TTL.LECTURES,
        }
      );
      logger.debug('Popular lectures cached');
    } catch (error: any) {
      console.warn('⚠️ Failed to warm popular lectures:', error.message);
      captureSentryException(error as Error, { operation: 'warmup_popular_lectures' });
    }

    // Fetch and cache lecturers
    // Uses the same endpoint as lecturers.api.ts
    try {
      await this.get(
        '/api/all_rps_api.php',
        { page: 1, lim: 20, offset: 0 },
        {
          cacheKey: CACHE_CONFIG.KEYS.LECTURERS_LIST,
          ttl: CACHE_CONFIG.TTL.LECTURERS,
        }
      );
      logger.debug('Lecturers list cached');
    } catch (error: any) {
      console.warn('⚠️ Failed to warm lecturers list:', error.message);
      captureSentryException(error as Error, { operation: 'warmup_lecturers_list' });
    }

    logger.debug('Essential data warmup complete');
    addSentryBreadcrumb('Essential data warmup complete', 'cache');
  }

  /**
   * Invalidate cache for specific endpoint
   */
  public async invalidateCache(endpoint: string, params?: Record<string, any>): Promise<void> {
    const cacheKey = this.buildCacheKey('GET', endpoint, params);
    await cacheService.remove(cacheKey);
    logger.debug(`Invalidated cache: ${endpoint}`);
  }

  /**
   * Clear all API cache
   */
  public async clearAllCache(): Promise<void> {
    await cacheService.clearAll();
    logger.debug('Cleared all API cache');
  }
}

export const offlineFirstApi = OfflineFirstApi.getInstance();
