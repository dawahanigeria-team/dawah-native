/**
 * Enhanced Cache Service - Phase 3
 * Three-tier caching strategy: Memory → AsyncStorage → Network
 *
 * Features:
 * - In-memory cache (fastest)
 * - Persistent cache (AsyncStorage)
 * - TTL-based invalidation
 * - Offline-first approach
 * - Smart cache warming
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import { captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';
import { logger } from '@/utils/logger';

// Cache configuration
export const CACHE_CONFIG = {
  // TTL (Time To Live) in seconds
  TTL: {
    LECTURES: 3600,        // 1 hour
    LECTURERS: 86400,      // 24 hours
    SERIES: 7200,          // 2 hours
    SEARCH: 1800,          // 30 minutes
    LECTURE_DETAIL: 3600,  // 1 hour
  },

  // Cache limits
  LIMITS: {
    POPULAR_LECTURES: 20,
    RECENT_SEARCHES: 10,
    MEMORY_ENTRIES: 50,          // Max entries in memory cache
    MAX_MEMORY_SIZE: 10 * 1024 * 1024, // 10MB max memory cache size
  },

  // Cache keys
  KEYS: {
    POPULAR_LECTURES: 'cache_popular_lectures',
    LECTURERS_LIST: 'cache_lecturers_list',
    SERIES_LIST: 'cache_series_list',
    SEARCH_RESULTS: 'cache_search_results',
    LECTURE_DETAILS: 'cache_lecture_details',
    CACHE_INDEX: 'cache_index',
  },
};

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

export interface CacheStats {
  memoryHits: number;
  storageHits: number;
  misses: number;
  totalSize: number;
  entryCount: number;
}

class CacheService {
  private static instance: CacheService;

  // Memory cache (fastest)
  private memoryCache: Map<string, CacheEntry> = new Map();

  // Memory cache size tracking (in bytes)
  private memoryCacheSize = 0;

  // Cache statistics
  private stats: CacheStats = {
    memoryHits: 0,
    storageHits: 0,
    misses: 0,
    totalSize: 0,
    entryCount: 0,
  };

  // Offline mode flag (reserved for future use)
  // private isOffline = false;

  private constructor() {
    // Initialize cache index
    this.loadCacheIndex();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set offline mode (reserved for future use)
   */
  public setOfflineMode(offline: boolean): void {
    // this.isOffline = offline;
    logger.debug(`Cache: ${offline ? 'Offline' : 'Online'} mode`);
  }

  /**
   * Load cache index from storage
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const index = await AsyncStorage.getItem(CACHE_CONFIG.KEYS.CACHE_INDEX);
      if (index) {
        const stats = JSON.parse(index);
        this.stats = { ...this.stats, ...stats };
        logger.debug('Cache Index loaded:', this.stats);
      }
    } catch (error) {
      console.error('Failed to load cache index:', error);
    }
  }

  /**
   * Save cache index to storage
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_CONFIG.KEYS.CACHE_INDEX,
        JSON.stringify({
          entryCount: this.stats.entryCount,
          totalSize: this.stats.totalSize,
          lastUpdated: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to save cache index:', error);
    }
  }

  /**
   * Get data from cache (memory → storage → null)
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      // Step 1: Check memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (this.isEntryValid(memoryEntry)) {
          this.stats.memoryHits++;
          logger.debug(`Memory cache HIT: ${key}`);
          return memoryEntry.data as T;
        } else {
          // Expired - remove from memory and update size tracking
          const entrySize = JSON.stringify(memoryEntry.data).length;
          this.memoryCacheSize -= entrySize;
          this.memoryCache.delete(key);
        }
      }

      // Step 2: Check AsyncStorage
      const storedEntry = await AsyncStorage.getItem(key);
      if (storedEntry) {
        const entry: CacheEntry<T> = JSON.parse(storedEntry);

        if (this.isEntryValid(entry)) {
          this.stats.storageHits++;
          logger.debug(`Storage cache HIT: ${key}`);

          // Promote to memory cache
          this.setMemoryCache(key, entry);

          return entry.data;
        } else {
          // Expired - remove from storage
          await AsyncStorage.removeItem(key);
        }
      }

      // Cache miss
      this.stats.misses++;
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error: any) {
      console.error(`Cache get error for ${key}:`, error);
      captureSentryException(error, { operation: 'cache_get', key });
      return null;
    }
  }

  /**
   * Set data in cache (both memory and storage)
   */
  public async set<T = any>(
    key: string,
    data: T,
    ttl: number = CACHE_CONFIG.TTL.LECTURES
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        key,
      };

      // Save to memory cache
      this.setMemoryCache(key, entry);

      // Save to AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(entry));

      // Update stats
      this.stats.entryCount++;
      const dataSize = JSON.stringify(data).length;
      this.stats.totalSize += dataSize;

      await this.saveCacheIndex();

      logger.debug(`Cached: ${key} (${this.formatBytes(dataSize)}, TTL: ${ttl}s)`);

      // Add breadcrumb
      addSentryBreadcrumb(`Cached data: ${key}`, 'cache', { ttl, size: dataSize });
    } catch (error: any) {
      console.error(`Cache set error for ${key}:`, error);
      captureSentryException(error, { operation: 'cache_set', key });
    }
  }

  /**
   * Set memory cache with LRU eviction (by size and count)
   */
  private setMemoryCache(key: string, entry: CacheEntry): void {
    // Calculate entry size in bytes
    const entrySize = JSON.stringify(entry.data).length;

    // Size-based eviction: Remove oldest entries until there's space
    while (
      this.memoryCache.size > 0 &&
      this.memoryCacheSize + entrySize > CACHE_CONFIG.LIMITS.MAX_MEMORY_SIZE
    ) {
      const oldestKey = this.memoryCache.keys().next().value as string | undefined;
      if (oldestKey) {
        const oldEntry = this.memoryCache.get(oldestKey);
        if (oldEntry) {
          const oldSize = JSON.stringify(oldEntry.data).length;
          this.memoryCacheSize -= oldSize;
        }
        this.memoryCache.delete(oldestKey);
        logger.debug(`Memory cache: Evicted ${oldestKey} (size limit)`);
      } else {
        break;
      }
    }

    // Count-based eviction: If still over entry limit, remove oldest
    if (this.memoryCache.size >= CACHE_CONFIG.LIMITS.MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value as string | undefined;
      if (oldestKey) {
        const oldEntry = this.memoryCache.get(oldestKey);
        if (oldEntry) {
          const oldSize = JSON.stringify(oldEntry.data).length;
          this.memoryCacheSize -= oldSize;
        }
        this.memoryCache.delete(oldestKey);
        logger.debug(`Memory cache: Evicted ${oldestKey} (count limit)`);
      }
    }

    // Add new entry and update size tracking
    this.memoryCache.set(key, entry);
    this.memoryCacheSize += entrySize;
  }

  /**
   * Check if cache entry is still valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // age in seconds
    return age < entry.ttl;
  }

  /**
   * Remove specific cache entry
   */
  public async remove(key: string): Promise<void> {
    try {
      // Update memory size tracking before deleting
      const entry = this.memoryCache.get(key);
      if (entry) {
        const entrySize = JSON.stringify(entry.data).length;
        this.memoryCacheSize -= entrySize;
      }

      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
      logger.debug(`Removed cache: ${key}`);
    } catch (error: any) {
      console.error(`Cache remove error for ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  public async clearAll(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();
      this.memoryCacheSize = 0; // Reset memory size tracking

      // Get all cache keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      // Remove all cache entries
      await AsyncStorage.multiRemove(cacheKeys);

      // Reset stats
      this.stats = {
        memoryHits: 0,
        storageHits: 0,
        misses: 0,
        totalSize: 0,
        entryCount: 0,
      };

      await this.saveCacheIndex();

      logger.debug('Cleared all cache');
      addSentryBreadcrumb('Cleared all cache', 'cache');
    } catch (error: any) {
      console.error('Cache clear error:', error);
      captureSentryException(error, { operation: 'cache_clear' });
    }
  }

  /**
   * Clear expired entries
   */
  public async clearExpired(): Promise<void> {
    try {
      let clearedCount = 0;

      // Clear from memory
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isEntryValid(entry)) {
          // Update memory size tracking before deleting
          const entrySize = JSON.stringify(entry.data).length;
          this.memoryCacheSize -= entrySize;

          this.memoryCache.delete(key);
          clearedCount++;
        }
      }

      // Clear from storage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (!this.isEntryValid(entry)) {
            await AsyncStorage.removeItem(key);
            clearedCount++;
          }
        }
      }

      logger.debug(`Cleared ${clearedCount} expired cache entries`);
    } catch (error: any) {
      console.error('Clear expired error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.calculateHitRate(),
      memoryCacheSize: this.memoryCacheSize,
      memoryCacheEntries: this.memoryCache.size,
    } as any;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(): number {
    const totalRequests = this.stats.memoryHits + this.stats.storageHits + this.stats.misses;
    if (totalRequests === 0) return 0;

    const hits = this.stats.memoryHits + this.stats.storageHits;
    return (hits / totalRequests) * 100;
  }

  /**
   * Warm up cache with popular content
   */
  public async warmupCache(popularLectures: any[], lecturers: any[], series: any[]): Promise<void> {
    try {
      logger.debug('Warming up cache...');

      // Cache popular lectures (first 20)
      const limitedLectures = popularLectures.slice(0, CACHE_CONFIG.LIMITS.POPULAR_LECTURES);
      await this.set(
        CACHE_CONFIG.KEYS.POPULAR_LECTURES,
        limitedLectures,
        CACHE_CONFIG.TTL.LECTURES
      );

      // Cache lecturers
      await this.set(
        CACHE_CONFIG.KEYS.LECTURERS_LIST,
        lecturers,
        CACHE_CONFIG.TTL.LECTURERS
      );

      // Cache series
      await this.set(
        CACHE_CONFIG.KEYS.SERIES_LIST,
        series,
        CACHE_CONFIG.TTL.SERIES
      );

      logger.debug('Cache warmed up successfully');
      addSentryBreadcrumb('Cache warmup complete', 'cache', {
        lectures: limitedLectures.length,
        lecturers: lecturers.length,
        series: series.length,
      });
    } catch (error: any) {
      console.error('Cache warmup error:', error);
      captureSentryException(error, { operation: 'cache_warmup' });
    }
  }

  /**
   * Format bytes to human-readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get cache size
   */
  public async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Get cache size error:', error);
      return 0;
    }
  }

  /**
   * Get formatted cache size
   */
  public async getFormattedCacheSize(): Promise<string> {
    const size = await this.getCacheSize();
    return this.formatBytes(size);
  }
}

export const cacheService = CacheService.getInstance();
