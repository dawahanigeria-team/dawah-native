/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using expo-audio
 * Syncs audio status with the playerStore
 */

import React, { useEffect, useRef } from 'react';
import { setAudioModeAsync } from 'expo-audio';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { playerStore, setAudioControls } from '../../stores/playerStore';

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
          playsInSilentMode: true,
        });
        console.log('✅ Audio mode configured for background playback');
      } catch (error) {
        console.error('❌ Failed to configure audio mode:', error);
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
    onPlaybackFinished: () => {
      const currentState = playerStore.get();
      // Reset playback to the beginning when finished
      playerStore.set({
        ...currentState,
        isPlaying: false,
        progress: 0,
      });
      console.log('🎵 Playback finished, reset to beginning');
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
