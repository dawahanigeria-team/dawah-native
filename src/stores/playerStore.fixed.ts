/**
 * Fixed Player Store Implementation
 * More robust implementation that handles initialization issues
 */

import { entity } from "simpler-state";
import { Episode, PlayerState } from "../types/types";

const initialState: PlayerState = {
  currentEpisode: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  isExpanded: false,
  isLoading: false,
  playbackSpeed: 1.0,
  volume: 1.0,
  isDownloaded: false,
  isDownloading: false,
  downloadProgress: 0,
};

// Create the entity with default value
export const playerStore = entity(initialState, [initialState]);

// Helper to safely get current state
const getCurrentState = (): PlayerState => {
  try {
    return playerStore.get() || initialState;
  } catch (error) {
    console.warn('Error getting player state:', error);
    return initialState;
  }
};

// Helper to safely set state
const setPlayerState = (newState: Partial<PlayerState>) => {
  try {
    const currentState = getCurrentState();
    playerStore.set({
      ...currentState,
      ...newState,
    });
  } catch (error) {
    console.error('Error setting player state:', error);
  }
};

/**
 * Player Store Hook
 * Provides all player functionality with error handling
 */
export const usePlayerStore = () => {
  // Try to use the reactive state, fallback to current state if error
  let state: PlayerState;

  try {
    // Use the hook with error boundary
    state = playerStore.use() || initialState;
  } catch (error) {
    // Fallback to non-reactive state if hook fails
    console.warn('Using non-reactive player state due to error:', error);
    state = getCurrentState();
  }

  const playEpisode = (episode: Episode) => {
    if (!episode) {
      console.error('Cannot play null episode');
      return;
    }

    setPlayerState({
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec || 0,
      isExpanded: true,
      isLoading: false,
    });
  };

  const togglePlayPause = () => {
    const current = getCurrentState();
    setPlayerState({
      isPlaying: !current.isPlaying,
    });
  };

  const setProgress = (progress: number) => {
    if (progress < 0 || isNaN(progress)) return;
    setPlayerState({ progress });
  };

  const expandPlayer = () => {
    setPlayerState({ isExpanded: true });
  };

  const minimizePlayer = () => {
    setPlayerState({ isExpanded: false });
  };

  const likeEpisode = (episodeId: string) => {
    const current = getCurrentState();
    if (current.currentEpisode?.id === episodeId && current.currentEpisode) {
      setPlayerState({
        currentEpisode: {
          ...current.currentEpisode,
          liked: !current.currentEpisode.liked,
        },
      });
    }
  };

  const seekForward = (seconds: number = 15) => {
    const current = getCurrentState();
    const newProgress = Math.min(
      current.progress + seconds,
      current.duration
    );
    setPlayerState({ progress: newProgress });
  };

  const seekBackward = (seconds: number = 15) => {
    const current = getCurrentState();
    const newProgress = Math.max(current.progress - seconds, 0);
    setPlayerState({ progress: newProgress });
  };

  const setPlaybackSpeed = (speed: number) => {
    if (speed < 0.5 || speed > 2.0) return;
    setPlayerState({ playbackSpeed: speed });
  };

  const setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setPlayerState({ volume: clampedVolume });
  };

  const setLoading = (isLoading: boolean) => {
    setPlayerState({ isLoading });
  };

  const downloadEpisode = (episode: Episode) => {
    if (!episode) return;

    setPlayerState({
      isDownloading: true,
      downloadProgress: 0,
    });

    // Simulate download progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 0.1;

      if (progress >= 1) {
        progress = 1;
        clearInterval(interval);
        setPlayerState({
          isDownloading: false,
          isDownloaded: true,
          downloadProgress: 1,
        });
      } else {
        setPlayerState({
          downloadProgress: progress,
        });
      }
    }, 200);
  };

  const closePlayer = () => {
    playerStore.set(initialState);
  };

  // Return the API
  return {
    // State
    ...state,

    // Actions
    playEpisode,
    togglePlayPause,
    setProgress,
    expandPlayer,
    minimizePlayer,
    likeEpisode,
    seekForward,
    seekBackward,
    setPlaybackSpeed,
    setVolume,
    setLoading,
    downloadEpisode,
    closePlayer,
  };
};

/**
 * Non-hook API for use outside React components
 */
export const playerAPI = {
  playEpisode: (episode: Episode) => {
    if (!episode) return;

    setPlayerState({
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec || 0,
      isExpanded: true,
      isLoading: false,
    });
  },

  pause: () => {
    setPlayerState({ isPlaying: false });
  },

  play: () => {
    setPlayerState({ isPlaying: true });
  },

  getState: getCurrentState,

  reset: () => {
    playerStore.set(initialState);
  },
};