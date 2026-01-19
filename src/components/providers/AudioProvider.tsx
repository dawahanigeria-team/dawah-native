/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using expo-audio
 * Syncs audio status with the playerStore
 */

import { setAudioModeAsync } from 'expo-audio';
import React, { useEffect, useRef } from 'react';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { addSentryBreadcrumb, captureSentryException } from '../../services/config/sentry.config';
import { getPlayNextRef, playerStore, setAudioControls } from '../../stores/playerStore';

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const isInitializedRef = useRef(false);

  // Configure audio mode for background playback and proper audio focus handling
  useEffect(() => {
    const setupAudioMode = async () => {
      try {
        await setAudioModeAsync({
          // Enable playback in silent mode (iOS)
          playsInSilentMode: true,

          // Keep audio active when app goes to background
          shouldPlayInBackground: true,

          // Handle interruptions (phone calls, other apps)
          // iOS: Request exclusive audio focus to prevent background interruption
          // Using 'doNotMix' ensures iOS gives our audio priority and doesn't stop it
          interruptionMode: 'doNotMix',
          // Android: temporarily duck other audio instead of fully stopping it
          interruptionModeAndroid: 'duckOthers',

          // Do not route audio through the earpiece on Android
          shouldRouteThroughEarpiece: false,
        });

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
      const shouldUpdateProgress =
        status.isPlaying ||
        status.isBuffering ||
        status.currentTime < currentState.progress ||
        status.currentTime === 0;
      if (shouldUpdateProgress && status.currentTime !== currentState.progress) {
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

      const currentState = playerStore.get();
      const playNext = getPlayNextRef();

      // If there's a queue and playNext is available, play next track
      // Defensive check: ensure queue is an array before accessing .length
      const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
      if (playNext && queue.length > 0) {
        try {
          await playNext();
        } catch (error: any) {
          console.error('Failed to auto-play next track:', error);
          captureSentryException(error as Error, {
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
      }
    },
  });

  // Update audio controls reference whenever it changes
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
    }

    // Always keep the latest audioControls reference in playerStore
    setAudioControls(audioControls);
  }, [audioControls]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      setAudioControls(null);
      isInitializedRef.current = false;
    };
  }, []);

  return <>{children}</>;
};
