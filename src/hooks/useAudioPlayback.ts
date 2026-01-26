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
  const isReleasedRef = useRef(true);
  const desiredVolumeRef = useRef(1);
  const desiredMutedRef = useRef(false);

  // Create audio player instance with current URI (recreates when URI changes)
  // Pass empty string initially, will be updated via state
  // Configure with keepAudioSessionActive to prevent iOS from stopping playback
  const player = useAudioPlayer(currentUri || '', {
    keepAudioSessionActive: true, // Prevent audio session deactivation on iOS
  });

  // Get real-time playback status
  const playerStatus = useAudioPlayerStatus(player);

  // Build normalized status object
  // IMPORTANT: Use timeControlStatus to detect actual playback vs buffering stalls
  // On iOS, playing=true can coexist with timeControlStatus="waiting" when buffering mid-stream
  // timeControlStatus values: "playing" | "paused" | "waiting"
  const timeControlStatus = (playerStatus as any).timeControlStatus as string | undefined;

  const isActuallyPlaying =
    playerStatus.playing &&
    timeControlStatus !== 'waiting';

  // Detect buffering: either explicit isBuffering flag OR timeControlStatus indicates waiting
  const isBufferingOrStalled =
    playerStatus.isBuffering ||
    (timeControlStatus === 'waiting' && playerStatus.playing);

  const status: AudioPlaybackStatus = {
    isLoaded: playerStatus.isLoaded || false,
    isPlaying: isActuallyPlaying,
    isPaused: !playerStatus.playing && playerStatus.currentTime > 0,
    isBuffering: isBufferingOrStalled,
    currentTime: playerStatus.currentTime || 0,
    duration: playerStatus.duration || 0,
    volume: player.volume || 1,
    muted: player.muted || false,
    playbackRate: 1, // expo-audio doesn't expose this in status
    didJustFinish: false,
  };

  // Watch for when audio becomes loaded
  useEffect(() => {
    if (!currentUri) {
      isReleasedRef.current = true;
    }
  }, [currentUri]);

  const safePlayerCall = (label: string, fn: () => unknown) => {
    if (isReleasedRef.current) {
      console.warn(`Skip ${label}: audio player released`);
      return;
    }

    try {
      const result = fn();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          console.error(`Failed to ${label}:`, error);
        });
      }
    } catch (error) {
      console.error(`Failed to ${label}:`, error);
    }
  };

  // Watch for when audio becomes loaded
  useEffect(() => {

    // Consider audio loaded if either:
    // 1. isLoaded is true, OR
    // 2. duration > 0 (some implementations use duration as loaded indicator)
    const isActuallyLoaded = playerStatus.isLoaded || (playerStatus.duration > 0);

    if (isActuallyLoaded && loadResolveRef.current) {
      setIsReady(true);
      isReleasedRef.current = false;
      safePlayerCall('apply volume', () => {
        player.volume = desiredVolumeRef.current;
        player.muted = desiredMutedRef.current;
        return undefined;
      });
      loadResolveRef.current();
      loadResolveRef.current = null;
      loadRejectRef.current = null;
    }
  }, [playerStatus.isLoaded, playerStatus.duration, playerStatus.isBuffering]);

  // Detect playback finished
  useEffect(() => {
    const prev = previousStatusRef.current;

    // Check if playback just finished
    // IMPORTANT: Don't trigger if we're just buffering mid-stream
    if (
      prev &&
      prev.isPlaying &&
      !status.isPlaying &&
      !status.isBuffering && // Not a buffering stall
      status.currentTime > 0 &&
      status.duration > 0 &&
      Math.abs(status.currentTime - status.duration) < 1 // Within 1 second of end
    ) {
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
    isReleasedRef.current = true;

    // If same URI already loaded, reset to beginning and resolve immediately
    if (currentUri === normalizedUri && status.isLoaded) {
      setIsReady(true);
      isReleasedRef.current = false;
      return Promise.resolve();
    }

    // Reject any pending load promise before starting a new one
    if (loadRejectRef.current) {
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
        setCurrentUri(normalizedUri);

        // The useEffect watching playerStatus.isLoaded will resolve the promise

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

    const isAtEnd =
      status.duration > 0 &&
      status.currentTime >= Math.max(0, status.duration - 0.25);
    if (isAtEnd) {
      safePlayerCall('seek', () => player.seekTo(0));
    }

    safePlayerCall('unmute', () => {
      player.muted = false;
      return undefined;
    });
    safePlayerCall('play audio', () => player.play());
  };

  // Pause audio
  const pause = () => {
    if (!status.isLoaded) {
      console.warn('Cannot pause: audio not loaded');
      return;
    }

    safePlayerCall('pause audio', () => player.pause());
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (status.isPlaying) {
      pause();
    } else {
      const isAtEnd =
        status.duration > 0 &&
        status.currentTime >= Math.max(0, status.duration - 0.25);
      if (isAtEnd) {
        safePlayerCall('seek', () => player.seekTo(0));
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

    const clampedSeconds = Math.max(0, Math.min(seconds, status.duration));
    safePlayerCall('seek', () => player.seekTo(clampedSeconds));
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

    safePlayerCall('set playback rate', () => player.setPlaybackRate(rate));
  };

  // Set volume
  const setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(volume, 1));
    desiredVolumeRef.current = clampedVolume;
    safePlayerCall('set volume', () => {
      player.volume = clampedVolume;
      return undefined;
    });
  };

  // Stop playback and reset position
  const stop = () => {
    if (!status.isLoaded) {
      return;
    }

    safePlayerCall('pause audio', () => player.pause());
    loadResolveRef.current = null;
    loadRejectRef.current = null;
  };

  // Unload audio
  const unload = () => {
    try {
      stop();
      isReleasedRef.current = true;
      setCurrentUri(null); // Clear the audio source
      setIsReady(false);
      loadResolveRef.current = null;
      loadRejectRef.current = null;
    } catch (error) {
      console.error('Failed to unload audio:', error);
    }
  };

  // Set lock screen information to maintain background playback
  // iOS requires audio to be loaded and preferably playing for lock screen controls to appear
  const setLockScreenInfo = (info: { title: string; artist?: string; artwork?: string }) => {
    try {
      // Only set lock screen info if audio is loaded
      // This ensures iOS recognizes the audio session as active
      if (!status.isLoaded) {
        console.warn('Cannot set lock screen info: audio not loaded yet');
        return;
      }

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
