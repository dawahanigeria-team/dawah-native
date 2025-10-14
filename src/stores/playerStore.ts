import { entity } from "simpler-state";
import { Episode, PlayerState } from "../types/types";
import { audioService, AVPlaybackStatus } from "../services/audioService";

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

// Initialize audio service and set up playback status updates
audioService.initialize().then(() => {
  audioService.setPlaybackStatusUpdateCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const currentState = playerStore.get();
      const updates: Partial<PlayerState> = {};

      // Update playing state
      if (status.isPlaying !== currentState.isPlaying) {
        updates.isPlaying = status.isPlaying;
      }

      // Update progress and duration
      if (status.positionMillis !== undefined) {
        updates.progress = status.positionMillis / 1000; // Convert to seconds
      }
      if (status.durationMillis !== undefined) {
        updates.duration = status.durationMillis / 1000; // Convert to seconds
      }

      // Update loading state
      if (status.isBuffering !== undefined) {
        updates.isLoading = status.isBuffering;
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        playerStore.set({
          ...currentState,
          ...updates,
        });
      }

      // Handle playback finished
      if (status.didJustFinish && !status.isLooping) {
        playerStore.set({
          ...currentState,
          isPlaying: false,
          progress: 0,
        });
      }
    }
  });
});

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

    try {
      const currentState = playerStore.get();

      // Check if we're already playing this episode
      if (currentState.currentEpisode?.id === episode.id) {
        console.log('📱 PlayerStore: Same episode already loaded');

        // If it's paused, just resume
        if (!currentState.isPlaying) {
          console.log('▶️ PlayerStore: Resuming playback...');
          await audioService.play();
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
        await audioService.stop();
        await audioService.unloadAudio();
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
        await audioService.loadAudio(episode.audioUrl);

        console.log('▶️ PlayerStore: Starting playback...');
        await audioService.play();

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

  const togglePlayPause = async () => {
    try {
      const currentState = playerStore.get();
      if (!currentState.currentEpisode) return;

      const isNowPlaying = await audioService.togglePlayPause();
      playerStore.set({
        ...currentState,
        isPlaying: isNowPlaying,
      });
    } catch (error) {
      console.error('Failed to toggle play/pause:', error);
    }
  };

  const setProgress = async (progress: number) => {
    try {
      // Update store immediately for UI responsiveness
      playerStore.set({
        ...playerStore.get(),
        progress,
      });
      // Seek audio to the position
      await audioService.seekTo(progress * 1000); // Convert to milliseconds
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

  const seekForward = async (seconds: number = 15) => {
    try {
      await audioService.seekForward(seconds);
      // Progress will be updated via the playback status callback
    } catch (error) {
      console.error('Failed to seek forward:', error);
    }
  };

  const seekBackward = async (seconds: number = 15) => {
    try {
      await audioService.seekBackward(seconds);
      // Progress will be updated via the playback status callback
    } catch (error) {
      console.error('Failed to seek backward:', error);
    }
  };

  const setPlaybackSpeed = async (speed: number) => {
    try {
      playerStore.set({
        ...playerStore.get(),
        playbackSpeed: speed,
      });
      await audioService.setPlaybackRate(speed);
    } catch (error) {
      console.error('Failed to set playback speed:', error);
    }
  };

  const setVolume = async (volume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      playerStore.set({
        ...playerStore.get(),
        volume: clampedVolume,
      });
      await audioService.setVolume(clampedVolume);
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

  const closePlayer = async () => {
    try {
      // Stop and unload audio
      await audioService.stop();
      await audioService.unloadAudio();

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
