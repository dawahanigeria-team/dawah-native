import { entity } from "simpler-state";
import { Episode, PlayerState } from "../types/types";

const initialState: PlayerState = {
  currentEpisode: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  isExpanded: false,
};

export const playerStore = entity(initialState);

export const usePlayerStore = () => {
  const state = playerStore.use();

  const playEpisode = (episode: Episode) => {
    playerStore.set({
      ...state,
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec,
      isExpanded: false,
    });
  };

  const togglePlayPause = () => {
    playerStore.set({
      ...state,
      isPlaying: !state.isPlaying,
    });
  };

  const setProgress = (progress: number) => {
    playerStore.set({
      ...state,
      progress,
    });
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

  return {
    ...state,
    playEpisode,
    togglePlayPause,
    setProgress,
    expandPlayer,
    minimizePlayer,
    likeEpisode,
  };
};
