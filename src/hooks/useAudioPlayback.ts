/**
 * Audio Playback Hook
 * Custom hook that wraps expo-audio for centralized audio playback management
 */

import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

export interface AudioPlaybackConfig {
  onPlaybackStatusUpdate?: (status: AudioPlaybackStatus) => void;
  onPlaybackFinished?: () => void;
}

export interface AudioPlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  didJustFinish?: boolean;
}

export interface AudioPlaybackControls {
  loadAudio: (uri: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
  unload: () => void;
  status: AudioPlaybackStatus;
  isReady: boolean;
}

/**
 * Custom hook for audio playback using expo-audio
 */
export function useAudioPlayback(config?: AudioPlaybackConfig): AudioPlaybackControls {
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const previousStatusRef = useRef<AudioPlaybackStatus | null>(null);

  // Create audio player instance with current URI
  const player = useAudioPlayer(currentUri || '');

  // Get real-time playback status
  const playerStatus = useAudioPlayerStatus(player);

  // Build normalized status object
  const status: AudioPlaybackStatus = {
    isLoaded: playerStatus.isLoaded || false,
    isPlaying: playerStatus.playing || false,
    isPaused: !playerStatus.playing && playerStatus.currentTime > 0,
    isBuffering: playerStatus.isBuffering || false,
    currentTime: playerStatus.currentTime || 0,
    duration: playerStatus.duration || 0,
    volume: player.volume || 1,
    muted: player.muted || false,
    playbackRate: 1, // expo-audio doesn't expose this in status
    didJustFinish: false,
  };

  // Detect playback finished
  useEffect(() => {
    const prev = previousStatusRef.current;

    // Check if playback just finished
    if (
      prev &&
      prev.isPlaying &&
      !status.isPlaying &&
      status.currentTime > 0 &&
      status.duration > 0 &&
      Math.abs(status.currentTime - status.duration) < 1 // Within 1 second of end
    ) {
      console.log('🎵 Audio playback finished');
      config?.onPlaybackFinished?.();
    }

    previousStatusRef.current = status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isPlaying, status.currentTime, status.duration]);

  // Call status update callback
  useEffect(() => {
    if (config?.onPlaybackStatusUpdate) {
      config.onPlaybackStatusUpdate(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.isPlaying, status.currentTime, status.duration, status.isLoaded]);

  // Load audio from URI
  const loadAudio = async (uri: string): Promise<void> => {
    try {
      console.log('🎵 Loading audio:', uri);

      // If same URI, just reset position
      if (currentUri === uri && player.isLoaded) {
        player.seekTo(0);
        setIsReady(true);
        return;
      }

      // Load new audio
      setIsReady(false);
      setCurrentUri(uri);

      // Wait for player to be ready
      // In expo-audio, loading happens automatically when URI changes
      await new Promise<void>((resolve) => {
        const checkLoaded = setInterval(() => {
          if (player.isLoaded) {
            clearInterval(checkLoaded);
            setIsReady(true);
            console.log('✅ Audio loaded successfully');
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkLoaded);
          if (!player.isLoaded) {
            console.error('⏱️ Audio loading timeout');
            setIsReady(false);
          }
          resolve();
        }, 10000);
      });
    } catch (error) {
      console.error('❌ Failed to load audio:', error);
      setIsReady(false);
      throw error;
    }
  };

  // Play audio
  const play = () => {
    if (!player.isLoaded) {
      console.warn('Cannot play: audio not loaded');
      return;
    }

    try {
      console.log('▶️ Playing audio');
      player.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  // Pause audio
  const pause = () => {
    if (!player.isLoaded) {
      console.warn('Cannot pause: audio not loaded');
      return;
    }

    try {
      console.log('⏸️ Pausing audio');
      player.pause();
    } catch (error) {
      console.error('Failed to pause audio:', error);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (player.playing) {
      pause();
    } else {
      // If at the end, reset to beginning before playing
      if (status.currentTime >= status.duration && status.duration > 0) {
        player.seekTo(0);
      }
      play();
    }
  };

  // Seek to specific position
  const seekTo = (seconds: number) => {
    if (!player.isLoaded) {
      console.warn('Cannot seek: audio not loaded');
      return;
    }

    try {
      const clampedSeconds = Math.max(0, Math.min(seconds, status.duration));
      console.log('⏩ Seeking to:', clampedSeconds);
      player.seekTo(clampedSeconds);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  };

  // Seek forward
  const seekForward = (seconds: number = 15) => {
    const newPosition = Math.min(status.currentTime + seconds, status.duration);
    seekTo(newPosition);
  };

  // Seek backward
  const seekBackward = (seconds: number = 15) => {
    const newPosition = Math.max(status.currentTime - seconds, 0);
    seekTo(newPosition);
  };

  // Set playback rate
  const setPlaybackRate = (rate: number) => {
    if (!player.isLoaded) {
      console.warn('Cannot set playback rate: audio not loaded');
      return;
    }

    try {
      console.log('🎚️ Setting playback rate to:', rate);
      player.setPlaybackRate(rate);
    } catch (error) {
      console.error('Failed to set playback rate:', error);
    }
  };

  // Set volume
  const setVolume = (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(volume, 1));
      player.volume = clampedVolume;
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  };

  // Stop playback and reset position
  const stop = () => {
    if (!player.isLoaded) {
      return;
    }

    try {
      console.log('⏹️ Stopping audio');
      player.pause();
      player.seekTo(0);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  // Unload audio
  const unload = () => {
    try {
      console.log('🗑️ Unloading audio');
      stop();
      setCurrentUri(null);
      setIsReady(false);
    } catch (error) {
      console.error('Failed to unload audio:', error);
    }
  };

  return {
    loadAudio,
    play,
    pause,
    togglePlayPause,
    seekTo,
    seekForward,
    seekBackward,
    setPlaybackRate,
    setVolume,
    stop,
    unload,
    status,
    isReady,
  };
}
