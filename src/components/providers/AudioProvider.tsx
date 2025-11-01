/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using expo-audio
 * Syncs audio status with the playerStore
 */

import React, { useEffect, useRef } from 'react';
import { setAudioModeAsync } from 'expo-audio';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { playerStore, setAudioControls, getPlayNextRef } from '../../stores/playerStore';
import { captureSentryException, addSentryBreadcrumb } from '../../services/config/sentry.config';

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const isInitializedRef = useRef(false);

  // Configure audio mode for background playback
  useEffect(() => {
    const setupAudioMode = async () => {
      try {
        await setAudioModeAsync({
          // Enable playback in silent mode (iOS)
          playsInSilentMode: true,

          // CRITICAL: Enable background audio playback
          shouldPlayInBackground: true,

          // Handle audio interruptions gracefully
          interruptionMode: 'mixWithOthers', // iOS: mix with other audio
          interruptionModeAndroid: 'duckOthers', // Android: duck other audio

          // Don't route through earpiece (Android)
          shouldRouteThroughEarpiece: false,
        });
        console.log('✅ Audio mode configured for background playback');
        console.log('🎵 Background audio: ENABLED');

        addSentryBreadcrumb('Background audio configured', 'info', {
          playsInSilentMode: true,
          shouldPlayInBackground: true,
        });
      } catch (error: any) {
        console.error('❌ Failed to configure audio mode:', error);
        captureSentryException(error, {
          component: 'AudioProvider',
          action: 'setupAudioMode',
          level: 'error',
        });
      }
    };

    setupAudioMode();
  }, []);

  // Initialize audio playback with status callbacks
  const audioControls = useAudioPlayback({
    onPlaybackStatusUpdate: (status) => {
      const currentState = playerStore.get();

      // Only update if there's an active episode
      if (!currentState.currentEpisode) return;

      const updates: Partial<typeof currentState> = {};

      // Update playing state
      if (status.isPlaying !== currentState.isPlaying) {
        updates.isPlaying = status.isPlaying;
      }

      // Update progress and duration
      if (status.currentTime !== currentState.progress) {
        updates.progress = status.currentTime;
      }
      if (status.duration !== currentState.duration && status.duration > 0) {
        updates.duration = status.duration;
      }

      // Update loading state
      if (status.isBuffering !== currentState.isLoading) {
        updates.isLoading = status.isBuffering;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        playerStore.set({
          ...currentState,
          ...updates,
        });
      }
    },
    onPlaybackFinished: async () => {
      console.log('🎵 Playback finished');

      const currentState = playerStore.get();
      const playNext = getPlayNextRef();

      // If there's a queue and playNext is available, play next track
      if (playNext && currentState.queue.length > 0) {
        try {
          console.log('▶️ Auto-playing next track in queue...');
          await playNext();
        } catch (error) {
          console.error('Failed to auto-play next track:', error);
          captureSentryException(error, {
            component: 'AudioProvider',
            action: 'onPlaybackFinished',
            level: 'error',
          });
          // Reset playback state on error
          playerStore.set({
            ...currentState,
            isPlaying: false,
            progress: 0,
          });
        }
      } else {
        // No queue, just reset playback
        playerStore.set({
          ...currentState,
          isPlaying: false,
          progress: 0,
        });
        console.log('⏹️ No queue, playback stopped');
      }
    },
  });

  // Update audio controls reference whenever it changes
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🎵 AudioProvider: Initializing audio controls');
      isInitializedRef.current = true;
    }

    // Always keep the latest audioControls reference in playerStore
    setAudioControls(audioControls);
  }, [audioControls]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('🎵 AudioProvider: Cleaning up audio controls');
      setAudioControls(null);
      isInitializedRef.current = false;
    };
  }, []);

  return <>{children}</>;
};
