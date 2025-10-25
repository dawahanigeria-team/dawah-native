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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureSentryException, addSentryBreadcrumb } from '../config/sentry.config';

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
    MEMORY_ENTRIES: 50,    // Max entries in memory cache
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
    console.log(`📡 Cache: ${offline ? 'Offline' : 'Online'} mode`);
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
        console.log('📦 Cache Index loaded:', this.stats);
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
          console.log(`🎯 Memory cache HIT: ${key}`);
          return memoryEntry.data as T;
        } else {
          // Expired - remove from memory
          this.memoryCache.delete(key);
        }
      }

      // Step 2: Check AsyncStorage
      const storedEntry = await AsyncStorage.getItem(key);
      if (storedEntry) {
        const entry: CacheEntry<T> = JSON.parse(storedEntry);

        if (this.isEntryValid(entry)) {
          this.stats.storageHits++;
          console.log(`💾 Storage cache HIT: ${key}`);

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
      console.log(`❌ Cache MISS: ${key}`);
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

      console.log(`✅ Cached: ${key} (${this.formatBytes(dataSize)}, TTL: ${ttl}s)`);

      // Add breadcrumb
      addSentryBreadcrumb(`Cached data: ${key}`, 'cache', { ttl, size: dataSize });
    } catch (error: any) {
      console.error(`Cache set error for ${key}:`, error);
      captureSentryException(error, { operation: 'cache_set', key });
    }
  }

  /**
   * Set memory cache with LRU eviction
   */
  private setMemoryCache(key: string, entry: CacheEntry): void {
    // Implement simple LRU: if cache is full, remove oldest entry
    if (this.memoryCache.size >= CACHE_CONFIG.LIMITS.MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value as string | undefined;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(key, entry);
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
      this.memoryCache.delete(key);
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Removed cache: ${key}`);
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

      console.log('🧹 Cleared all cache');
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

      console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
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
      console.log('🔥 Warming up cache...');

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

      console.log('✅ Cache warmed up successfully');
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
