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

export const playerStore = entity(initialState);

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

  const playEpisode = (episode: Episode) => {
    playerStore.set({
      ...playerStore.get(),
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec,
      isExpanded: true, // Start expanded when playing a new episode
      isLoading: false,
    });
  };

  const togglePlayPause = () => {
    const currentState = playerStore.get();
    playerStore.set({
      ...currentState,
      isPlaying: !currentState.isPlaying,
    });
  };

  const setProgress = (progress: number) => {
    playerStore.set({
      ...playerStore.get(),
      progress,
    });
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
    const currentState = playerStore.get();
    const newProgress = Math.min(currentState.progress + seconds, currentState.duration);
    playerStore.set({
      ...currentState,
      progress: newProgress,
    });
  };

  const seekBackward = (seconds: number = 15) => {
    const currentState = playerStore.get();
    const newProgress = Math.max(currentState.progress - seconds, 0);
    playerStore.set({
      ...currentState,
      progress: newProgress,
    });
  };

  const setPlaybackSpeed = (speed: number) => {
    playerStore.set({
      ...playerStore.get(),
      playbackSpeed: speed,
    });
  };

  const setVolume = (volume: number) => {
    playerStore.set({
      ...playerStore.get(),
      volume: Math.max(0, Math.min(1, volume)),
    });
  };

  const setLoading = (isLoading: boolean) => {
    playerStore.set({
      ...playerStore.get(),
      isLoading,
    });
  };

  const downloadEpisode = (episode: Episode) => {
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
    playerStore.set({
      ...initialState,
    });
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
