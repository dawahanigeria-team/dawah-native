/**
 * User Service
 * Manages user ID for favorites and playlists
 * Uses device ID for guest users until authentication is implemented
 */

import AsyncStorage from 'expo-sqlite/kv-store';
import { logger } from '@/utils/logger';

const USER_ID_KEY = 'user_id';

/**
 * Generate a simple unique ID
 */
const generateUniqueId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `guest_${timestamp}-${random}`;
};

class UserService {
  /**
   * Get or create user ID
   * For now, uses a guest ID until authentication is implemented
   */
  async getUserId(): Promise<string> {
    try {
      // Check if user ID exists
      let userId = await AsyncStorage.getItem(USER_ID_KEY);

      if (userId) {
        return userId;
      }

      userId = generateUniqueId();

      // Store it
      await AsyncStorage.setItem(USER_ID_KEY, userId);

      logger.debug('Created guest user ID:', userId);

      return userId;
    } catch (error) {
      logger.error('Failed to get/create user ID:', error, {
        operation: 'user_get_or_create_id',
      });
      // Fallback to a temporary ID
      return generateUniqueId();
    }
  }

  /**
   * Set user ID (called when user logs in)
   */
  async setUserId(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
      logger.debug('Set user ID:', userId);
    } catch (error) {
      logger.error('Failed to set user ID:', error, {
        operation: 'user_set_id',
        userId,
      });
    }
  }

  /**
   * Clear user ID (called when user logs out)
   */
  async clearUserId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_ID_KEY);
      logger.debug('Cleared user ID');
    } catch (error) {
      logger.error('Failed to clear user ID:', error, {
        operation: 'user_clear_id',
      });
    }
  }
}

export const userService = new UserService();
