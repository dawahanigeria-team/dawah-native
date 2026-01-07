/**
 * Audio Playback Hook
 * Custom hook that wraps expo-audio for centralized audio playback management
 */

import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

const HTTP_URL_REGEX = /^https?:\/\//i;

/**
 * Native players reject certain reserved characters (e.g. [] or '),
 * so ensure remote URLs are percent-encoded before loading.
 */
const sanitizeAudioUri = (uri: string): string => {
  if (!uri || !HTTP_URL_REGEX.test(uri)) {
    return uri;
  }

  const encode = (value: string) => encodeURI(value).replace(/'/g, '%27');

  try {
    return encode(decodeURI(uri));
  } catch {
    return encode(uri);
  }
};

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
  setLockScreenInfo: (info: { title: string; artist?: string; artwork?: string }) => void;
  status: AudioPlaybackStatus;
  isReady: boolean;
  player: any; // Expose player instance for advanced use cases
}

/**
 * Custom hook for audio playback using expo-audio
 */
export function useAudioPlayback(config?: AudioPlaybackConfig): AudioPlaybackControls {
  const [isReady, setIsReady] = useState(false);
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const previousStatusRef = useRef<AudioPlaybackStatus | null>(null);
  const loadResolveRef = useRef<(() => void) | null>(null);
  const loadRejectRef = useRef<((error?: unknown) => void) | null>(null);
  const isFirstLoad = useRef(true);

  // Create audio player instance with current URI (recreates when URI changes)
  // Pass empty string initially, will be updated via state
  // Configure with keepAudioSessionActive to prevent iOS from stopping playback
  const player = useAudioPlayer(currentUri || '', {
    keepAudioSessionActive: true, // Prevent audio session deactivation on iOS
  });

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

  // Watch for when audio becomes loaded
  useEffect(() => {
    console.log('📊 Audio status update - isLoaded:', playerStatus.isLoaded, 'duration:', playerStatus.duration, 'isBuffering:', playerStatus.isBuffering);

    // Consider audio loaded if either:
    // 1. isLoaded is true, OR
    // 2. duration > 0 (some implementations use duration as loaded indicator)
    const isActuallyLoaded = playerStatus.isLoaded || (playerStatus.duration > 0);

    if (isActuallyLoaded && loadResolveRef.current) {
      console.log('✅ Audio loaded successfully (isLoaded:', playerStatus.isLoaded, 'duration:', playerStatus.duration, ')');
      setIsReady(true);
      loadResolveRef.current();
      loadResolveRef.current = null;
      loadRejectRef.current = null;
    }
  }, [playerStatus.isLoaded, playerStatus.duration, playerStatus.isBuffering]);

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
    const normalizedUri = sanitizeAudioUri(uri);

    console.log('🎵 Loading audio:', uri);
    if (normalizedUri !== uri) {
      console.log('🔧 Normalized audio URL for playback:', normalizedUri);
    }

    // If same URI already loaded, reset to beginning and resolve immediately
    if (currentUri === normalizedUri && status.isLoaded) {
      console.log('🔄 Same URI already loaded, seeking to start');
      player.seekTo(0);
      setIsReady(true);
      return Promise.resolve();
    }

    // Reject any pending load promise before starting a new one
    if (loadRejectRef.current) {
      console.log('⚠️ Cancelling previous load request');
      loadRejectRef.current(new Error('Superseded by a new load request'));
      loadRejectRef.current = null;
      loadResolveRef.current = null;
    }

    return new Promise<void>((resolve, reject) => {
      try {
        loadResolveRef.current = resolve;
        loadRejectRef.current = reject;
        setIsReady(false);

        // Update URI state - this will cause React to recreate the player
        console.log('📥 Setting new audio source:', normalizedUri.substring(0, 80) + '...');
        setCurrentUri(normalizedUri);

        // The useEffect watching playerStatus.isLoaded will resolve the promise
        console.log('⏳ Waiting for audio to load (timeout: 30s)...');

        // Set a timeout to reject if loading takes too long
        const timeout = setTimeout(() => {
          if (loadRejectRef.current) {
            console.error('❌ Audio loading timeout after 30 seconds');
            console.error('Final status - isLoaded:', playerStatus.isLoaded, 'isBuffering:', playerStatus.isBuffering);
            console.error('Audio URL:', normalizedUri);
            loadRejectRef.current(new Error('Audio loading timeout - check network connection and audio URL'));
            loadRejectRef.current = null;
            loadResolveRef.current = null;
            setIsReady(false);
          }
        }, 30000); // 30 second timeout

        // Clear timeout when resolved
        const originalResolve = loadResolveRef.current;
        loadResolveRef.current = () => {
          clearTimeout(timeout);
          originalResolve?.();
        };
      } catch (error) {
        console.error('❌ Failed to initiate audio load:', error);
        setIsReady(false);
        setCurrentUri(null);
        loadResolveRef.current = null;
        loadRejectRef.current = null;
        reject(error);
      }
    });
  };

  // Play audio
  const play = () => {
    if (!status.isLoaded) {
      console.warn('Cannot play: audio not loaded');
      return;
    }

    try {
      // If at the end of audio, reset to beginning (expo-audio best practice)
      if (status.currentTime >= status.duration && status.duration > 0) {
        console.log('🔄 Audio finished, seeking to start');
        player.seekTo(0);
      }

      console.log('▶️ Playing audio');
      player.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  // Pause audio
  const pause = () => {
    if (!status.isLoaded) {
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
    if (status.isPlaying) {
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
    if (!status.isLoaded) {
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
    if (!status.isLoaded) {
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
    if (!status.isLoaded) {
      return;
    }

    try {
      console.log('⏹️ Stopping audio');
      player.pause();
      player.seekTo(0);
      loadResolveRef.current = null;
      loadRejectRef.current = null;
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  // Unload audio
  const unload = () => {
    try {
      console.log('🗑️ Unloading audio');
      stop();
      setCurrentUri(null); // Clear the audio source
      setIsReady(false);
      loadResolveRef.current = null;
      loadRejectRef.current = null;
    } catch (error) {
      console.error('Failed to unload audio:', error);
    }
  };

  // Set lock screen information to maintain background playback
  const setLockScreenInfo = (info: { title: string; artist?: string; artwork?: string }) => {
    try {
      console.log('🔒 Setting lock screen info:', info.title);
      player.setActiveForLockScreen(true, {
        title: info.title,
        artist: info.artist || '',
        artworkUrl: info.artwork || '',
      });
    } catch (error) {
      console.error('Failed to set lock screen info:', error);
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
    setLockScreenInfo,
    status,
    isReady,
    player, // Expose player instance
  };
}
