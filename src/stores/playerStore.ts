import { entity } from "simpler-state";
import { Episode, PlayerState, AudioStatus } from "../types/types";
import { AudioPlayerService } from "../services/audioPlayer";

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

// Create audio player instance with status callback
const audioPlayer = new AudioPlayerService((status: AudioStatus) => {
  const currentState = playerStore.get();

  playerStore.set({
    ...currentState,
    progress: status.currentTime,
    duration: status.duration,
    isPlaying: status.playing,
    isLoading: status.isBuffering,
  });

  // Handle end of playback
  if (status.didJustFinish) {
    playerStore.set({
      ...currentState,
      isPlaying: false,
      progress: 0,
    });
  }
});

export const usePlayerStore = () => {
  const state = playerStore.use();

  const playEpisode = (episode: Episode) => {
    playerStore.set({
      ...state,
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec,
      isExpanded: true, // Start expanded when playing a new episode
      isLoading: true,
    });
    audioPlayer.playEpisode(episode);
  };

  const togglePlayPause = () => {
    audioPlayer.togglePlayPause();
  };

  const setProgress = (progress: number) => {
    playerStore.set({
      ...state,
      progress,
    });
  };

  const seekTo = (position: number) => {
    audioPlayer.seekTo(position);
  };

  const expandPlayer = () => {
    playerStore.set({
      ...state,
      isExpanded: true,
    });
  };

  const minimizePlayer = () => {
    playerStore.set({
      ...state,
      isExpanded: false,
    });
  };

  const likeEpisode = (episodeId: string) => {
    if (state.currentEpisode?.id === episodeId) {
      playerStore.set({
        ...state,
        currentEpisode: {
          ...state.currentEpisode,
          liked: !state.currentEpisode.liked,
        },
      });
    }
  };

  const seekForward = (seconds: number = 15) => {
    const newProgress = Math.min(state.progress + seconds, state.duration);
    audioPlayer.seekTo(newProgress);
  };

  const seekBackward = (seconds: number = 15) => {
    const newProgress = Math.max(state.progress - seconds, 0);
    audioPlayer.seekTo(newProgress);
  };

  const setPlaybackSpeed = (speed: number) => {
    playerStore.set({
      ...state,
      playbackSpeed: speed,
    });
    audioPlayer.setPlaybackRate(speed);
  };

  const setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    playerStore.set({
      ...state,
      volume: clampedVolume,
    });
    audioPlayer.setVolume(clampedVolume);
  };

  const setLoading = (isLoading: boolean) => {
    playerStore.set({
      ...state,
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
    audioPlayer.cleanup();
    playerStore.set({
      ...initialState,
    });
  };

  return {
    ...state,
    playEpisode,
    togglePlayPause,
    setProgress,
    seekTo,
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
