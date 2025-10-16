import { entity } from "simpler-state";
import { Episode, PlayerState } from "../types/types";
import type { AudioPlaybackControls } from "../hooks/useAudioPlayback";

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

export const playerStore = entity(initialState);

// Audio controls instance - will be set by AudioProvider
let audioControls: AudioPlaybackControls | null = null;

/**
 * Set audio controls instance (called from AudioProvider)
 */
export const setAudioControls = (controls: AudioPlaybackControls | null) => {
  audioControls = controls;
};

/**
 * Get current audio controls instance
 */
export const getAudioControls = () => audioControls;

export const usePlayerStore = () => {
  // Use try-catch to handle potential initialization issues
  let state: PlayerState;

  try {
    state = playerStore.use();
  } catch (error) {
    console.warn('PlayerStore initialization issue, using default state:', error);
    state = initialState;
  }

  // Ensure state is valid
  if (!state) {
    state = initialState;
  }

  const playEpisode = async (episode: Episode) => {
    console.log('🎮 PlayerStore: playEpisode called with:', episode.title);

    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      const currentState = playerStore.get();

      // Check if we're already playing this episode
      if (currentState.currentEpisode?.id === episode.id) {
        console.log('📱 PlayerStore: Same episode already loaded');

        // If it's paused, just resume
        if (!currentState.isPlaying) {
          console.log('▶️ PlayerStore: Resuming playback...');
          audioControls.play();
          playerStore.set({
            ...currentState,
            isPlaying: true,
            isExpanded: false,  // Show mini player
          });
        } else {
          console.log('⏸️ PlayerStore: Already playing this episode');
          // Just show the mini player if it's hidden
          playerStore.set({
            ...currentState,
            isExpanded: false,
          });
        }
        return;
      }

      // If playing a different episode, stop the current one first
      if (currentState.currentEpisode) {
        console.log('🛑 PlayerStore: Stopping current episode...');
        audioControls.stop();
        audioControls.unload();
      }

      // Set loading state
      console.log('📊 PlayerStore: Setting initial state...');
      playerStore.set({
        ...playerStore.get(),
        currentEpisode: episode,
        isPlaying: false,
        progress: 0,
        duration: episode.durationSec,
        isExpanded: false,  // Changed to false - show mini player by default
        isLoading: true,
      });

      // Load and play the audio
      if (episode.audioUrl) {
        console.log('🔊 PlayerStore: Loading audio URL:', episode.audioUrl);
        await audioControls.loadAudio(episode.audioUrl);

        console.log('▶️ PlayerStore: Starting playback...');
        audioControls.play();

        // Update state after successful play
        console.log('✅ PlayerStore: Updating state to playing...');
        playerStore.set({
          ...playerStore.get(),
          isPlaying: true,
          isLoading: false,
        });
      } else {
        console.error('❌ PlayerStore: No audio URL provided!');
      }
    } catch (error) {
      console.error('❌ PlayerStore: Failed to play episode:', error);
      playerStore.set({
        ...playerStore.get(),
        isPlaying: false,
        isLoading: false,
      });
    }
  };

  const togglePlayPause = () => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      const currentState = playerStore.get();
      if (!currentState.currentEpisode) return;

      audioControls.togglePlayPause();
      // State will be updated by the status callback
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  };

  const setProgress = (progress: number) => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      // Update store immediately for UI responsiveness
      playerStore.set({
        ...playerStore.get(),
        progress,
      });
      // Seek audio to the position (expo-audio uses seconds)
      audioControls.seekTo(progress);
    } catch (error) {
      console.error('Failed to set progress:', error);
    }
  };

  const expandPlayer = () => {
    playerStore.set({
      ...playerStore.get(),
      isExpanded: true,
    });
  };

  const minimizePlayer = () => {
    playerStore.set({
      ...playerStore.get(),
      isExpanded: false,
    });
  };

  const likeEpisode = (episodeId: string) => {
    const currentState = playerStore.get();
    if (currentState.currentEpisode?.id === episodeId) {
      playerStore.set({
        ...currentState,
        currentEpisode: {
          ...currentState.currentEpisode,
          liked: !currentState.currentEpisode.liked,
        },
      });
    }
  };

  const seekForward = (seconds: number = 15) => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      audioControls.seekForward(seconds);
      // Progress will be updated via the playback status callback
    } catch (error) {
      console.error('Failed to seek forward:', error);
    }
  };

  const seekBackward = (seconds: number = 15) => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      audioControls.seekBackward(seconds);
      // Progress will be updated via the playback status callback
    } catch (error) {
      console.error('Failed to seek backward:', error);
    }
  };

  const setPlaybackSpeed = (speed: number) => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      playerStore.set({
        ...playerStore.get(),
        playbackSpeed: speed,
      });
      audioControls.setPlaybackRate(speed);
    } catch (error) {
      console.error('Failed to set playback speed:', error);
    }
  };

  const setVolume = (volume: number) => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      playerStore.set({
        ...playerStore.get(),
        volume: clampedVolume,
      });
      audioControls.setVolume(clampedVolume);
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  };

  const setLoading = (isLoading: boolean) => {
    playerStore.set({
      ...playerStore.get(),
      isLoading,
    });
  };

  const downloadEpisode = (_episode: Episode) => {
    playerStore.set({
      ...state,
      isDownloading: true,
      downloadProgress: 0,
    });

    // Simulate download progress
    const simulateDownload = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 0.1;
        if (progress >= 1) {
          progress = 1;
          clearInterval(interval);
          playerStore.set({
            ...playerStore.get(),
            isDownloading: false,
            isDownloaded: true,
            downloadProgress: 1,
          });
        } else {
          playerStore.set({
            ...playerStore.get(),
            downloadProgress: progress,
          });
        }
      }, 200);
    };

    simulateDownload();
  };

  const closePlayer = () => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      // Stop and unload audio
      audioControls.stop();
      audioControls.unload();

      // Reset store to initial state
      playerStore.set({
        ...initialState,
      });
    } catch (error) {
      console.error('Failed to close player:', error);
      // Reset store even if audio cleanup fails
      playerStore.set({
        ...initialState,
      });
    }
  };

  return {
    ...state,
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
