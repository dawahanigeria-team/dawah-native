import React, { createContext, useContext, useState, useCallback } from 'react';
import { Episode, PlayerState } from '../types/types';

interface PlayerContextType {
  playerState: PlayerState;
  playEpisode: (episode: Episode) => void;
  togglePlayPause: () => void;
  setProgress: (progress: number) => void;
  expandPlayer: () => void;
  minimizePlayer: () => void;
  likeEpisode: (episodeId: string) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

interface PlayerProviderProps {
  children: React.ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentEpisode: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    isExpanded: false,
  });

  const playEpisode = useCallback((episode: Episode) => {
    setPlayerState(prev => ({
      ...prev,
      currentEpisode: episode,
      isPlaying: true,
      progress: 0,
      duration: episode.durationSec,
      isExpanded: false,
    }));
  }, []);

  const togglePlayPause = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setPlayerState(prev => ({
      ...prev,
      progress,
    }));
  }, []);

  const expandPlayer = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      isExpanded: true,
    }));
  }, []);

  const minimizePlayer = useCallback(() => {
    setPlayerState(prev => ({
      ...prev,
      isExpanded: false,
    }));
  }, []);

  const likeEpisode = useCallback((episodeId: string) => {
    // In a real app, this would update the backend
    // For now, we'll just toggle the local state
    setPlayerState(prev => ({
      ...prev,
      currentEpisode: prev.currentEpisode?.id === episodeId 
        ? { ...prev.currentEpisode, liked: !prev.currentEpisode.liked }
        : prev.currentEpisode,
    }));
  }, []);

  return (
    <PlayerContext.Provider value={{
      playerState,
      playEpisode,
      togglePlayPause,
      setProgress,
      expandPlayer,
      minimizePlayer,
      likeEpisode,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};
