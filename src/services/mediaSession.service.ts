/**
 * Media Session Service
 * Handles lock screen and notification controls for audio playback
 * Provides a unified interface for both iOS and Android
 */

import { Platform } from 'react-native';

export interface MediaMetadata {
  title: string;
  artist?: string;
  artwork?: string;
  duration?: number;
}

/**
 * Initialize media session for lock screen controls
 * This should be called once when the app starts
 */
export const initializeMediaSession = async (): Promise<void> => {
  try {
    if (Platform.OS === 'android') {
      // Android: Media session is initialized by expo-audio
      // The notification will be created automatically when audio plays
      // with setActiveForLockScreen(true)
    } else if (Platform.OS === 'ios') {
      // iOS: Audio session is managed by expo-audio
      // UIBackgroundModes in app.json enables background audio
    }
  } catch (error) {
    console.error('Failed to initialize media session:', error);
  }
};

/**
 * Update media session metadata
 * This updates the lock screen notification with current track info
 */
export const updateMediaMetadata = (_metadata: MediaMetadata): void => {
  try {
    // Metadata is updated via player.setActiveForLockScreen in useAudioPlayback
    // This function exists for future extensibility
  } catch (error) {
    console.error('Failed to update media metadata:', error);
  }
};

/**
 * Clear media session when playback stops
 */
export const clearMediaSession = (): void => {
  try {
    // Media session is cleared automatically by expo-audio
    // when player.setActiveForLockScreen(false) is called
  } catch (error) {
    console.error('Failed to clear media session:', error);
  }
};
