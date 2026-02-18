/**
 * Favorites API Service
 * Handles user favorites (liked lectures)
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import { apiClient, ApiError } from './base.api';
import { API_CONFIG } from '../config/api.config';
import { addSentryBreadcrumb, captureSentryException } from '../config/sentry.config';
import { userService } from '../user.service';
import { logger } from '@/utils/logger';

export interface ToggleFavoriteRequest {
  user_id: string;
  item_id: string;
  type: 'audio' | 'video';
}

export interface ToggleFavoriteResponse {
  success: boolean;
  message: string;
}

export interface FavoritesListResponse {
  user_id: number;
  audio?: number[];
  video?: number[];
}

class FavoritesApiService {
  private readonly FAVORITES_CACHE_KEY = 'favorites_cache';

  private isGuestUserId(userId: string): boolean {
    return userId.startsWith('guest_');
  }

  /**
   * Get user ID (creates guest ID if none exists)
   */
  private async getUserId(): Promise<string> {
    return await userService.getUserId();
  }

  /**
   * Toggle favorite (add or remove) - Works offline!
   */
  async toggleFavorite(
    lectureId: string,
    type: 'audio' | 'video' = 'audio'
  ): Promise<ToggleFavoriteResponse> {
    try {
      const userId = await this.getUserId();

      // Get current favorites from cache
      const cachedIds = await this.getCachedIds();
      const isCurrentlyFavorited = cachedIds.includes(lectureId);

      // Update cache immediately (optimistic update)
      let updatedIds: string[];
      if (isCurrentlyFavorited) {
        updatedIds = cachedIds.filter(id => id !== lectureId);
      } else {
        updatedIds = [...cachedIds, lectureId];
      }
      await this.cacheIds(updatedIds);

      addSentryBreadcrumb('Toggling favorite (offline-first)', 'user', {
        lectureId,
        userId,
        type,
        isCurrentlyFavorited,
      });

      // Guest users are local-only until authenticated user IDs are available.
      if (this.isGuestUserId(userId)) {
        return {
          success: true,
          message: isCurrentlyFavorited
            ? `${type} removed from favorites (guest mode)`
            : `${type} added to favorites (guest mode)`,
        };
      }

      // Try to sync with backend (but don't fail if offline)
      try {
        const response = await apiClient.post<ToggleFavoriteResponse>(
          '/api/leclisting_favorites.php',
          {
            user_id: userId,
            item_id: lectureId,
            type,
          },
          {
            timeout: API_CONFIG.TIMEOUTS.DEFAULT,
            useCache: false,
          }
        );

        logger.debug('Synced favorite to backend:', response.data.message);
        return response.data;
      } catch (networkError: any) {
        // If offline or network error, that's OK - we already updated locally
        if (networkError.isNetworkError || networkError.statusCode === 404) {
          logger.debug('Favorite saved locally (offline mode)');
          return {
            success: true,
            message: isCurrentlyFavorited
              ? 'audio removed from favorites (offline)'
              : 'audio added to favorites (offline)',
          };
        }
        // For other errors, still throw
        throw networkError;
      }
    } catch (error) {
      console.error('❌ Failed to toggle favorite:', error);
      captureSentryException(error as Error, {
        component: 'FavoritesApiService',
        action: 'toggleFavorite',
        lectureId,
        type,
      });

      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Failed to update favorites', undefined, error);
    }
  }

  /**
   * Get list of favorite lecture IDs
   */
  async getFavoriteIds(type: 'audio' | 'video' = 'audio'): Promise<string[]> {
    try {
      const userId = await this.getUserId();

      if (this.isGuestUserId(userId)) {
        const cachedIds = await this.getCachedIds();
        logger.debug(`Guest mode: using ${cachedIds.length} cached favorite ${type} IDs`);
        return cachedIds;
      }

      addSentryBreadcrumb('Fetching favorites', 'query', {
        userId,
        type,
      });

      const response = await apiClient.get<FavoritesListResponse>(
        '/api/leclisting_favorites.php',
        {
          user_id: userId,
          type,
        },
        {
          timeout: API_CONFIG.TIMEOUTS.DEFAULT,
          useCache: true,
          cacheTTL: 300, // Cache for 5 minutes
        }
      );

      // Extract lecture IDs from response
      const ids = response.data[type] || [];
      const lectureIds = ids.map(id => String(id));

      logger.debug(`Fetched ${lectureIds.length} favorite ${type} IDs from API`);

      // Cache the IDs locally
      await this.cacheIds(lectureIds);

      return lectureIds;
    } catch (error: any) {
      // Silently handle network errors - offline is normal
      if (error.isNetworkError) {
        logger.debug('Offline mode: Using cached favorites');
      } else if (error.statusCode === 404) {
        console.warn('⚠️ Favorites API not available (404). Using local storage only.');
      } else {
        // Only log/report unexpected errors
        console.warn('⚠️ Could not fetch favorites from API:', error.message);
        // Don't report network errors to Sentry
        if (!error.isNetworkError) {
          captureSentryException(error as Error, {
            component: 'FavoritesApiService',
            action: 'getFavoriteIds',
            type,
            level: 'warning',
          });
        }
      }

      // Always return cached IDs (works offline)
      const cachedIds = await this.getCachedIds();
      logger.debug(`Using ${cachedIds.length} locally cached favorite IDs`);
      return cachedIds;
    }
  }

  /**
   * Check if lecture is favorited
   */
  async isFavorited(lectureId: string): Promise<boolean> {
    const favoriteIds = await this.getFavoriteIds();
    return favoriteIds.includes(lectureId);
  }

  /**
   * Cache favorite IDs locally
   */
  private async cacheIds(ids: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FAVORITES_CACHE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Failed to cache favorite IDs:', error);
    }
  }

  /**
   * Get cached favorite IDs
   */
  private async getCachedIds(): Promise<string[]> {
    try {
      const cached = await AsyncStorage.getItem(this.FAVORITES_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Failed to get cached favorite IDs:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  private async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.FAVORITES_CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear favorites cache:', error);
    }
  }

  /**
   * Clear all favorites data (logout)
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.FAVORITES_CACHE_KEY);
      await userService.clearUserId();
    } catch (error) {
      console.error('Failed to clear favorites data:', error);
    }
  }
}

export const favoritesApi = new FavoritesApiService();
