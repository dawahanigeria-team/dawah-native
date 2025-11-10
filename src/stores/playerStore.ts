import React, { useCallback } from "react";
import { entity } from "simpler-state";
import { Episode, PlayerState } from "../types/types";
import type { AudioPlaybackControls } from "../hooks/useAudioPlayback";
import { downloadsService } from "../services/downloads.service";
import { historyService } from "../services/history.service";
import { captureSentryException, addSentryBreadcrumb } from "../services/config/sentry.config";

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
  queue: [],
  currentQueueIndex: -1,
  isShuffled: false,
  repeatMode: 'off',
};

export const playerStore = entity(initialState);

// Audio controls instance - will be set by AudioProvider
let audioControls: AudioPlaybackControls | null = null;

// Store playNext reference for use in AudioProvider
let playNextRef: (() => Promise<void>) | null = null;

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

/**
 * Set playNext reference (called from usePlayerStore)
 */
export const setPlayNextRef = (fn: (() => Promise<void>) | null) => {
  playNextRef = fn;
};

/**
 * Get playNext reference
 */
export const getPlayNextRef = () => playNextRef;

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

  const playEpisode = useCallback(async (episode: Episode) => {
    console.log('🎮 PlayerStore: playEpisode called with:', episode.title);

    // Add breadcrumb for playback tracking
    addSentryBreadcrumb(
      `Playing episode: ${episode.title}`,
      'playback',
      { episodeId: episode.id, title: episode.title }
    );

    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      captureSentryException(
        new Error('Audio controls not initialized'),
        { episodeId: episode.id, title: episode.title }
      );
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
          setAndPersistPlayerState({
            ...currentState,
            isPlaying: true,
            isExpanded: false,  // Show mini player
          });
        } else {
          console.log('⏸️ PlayerStore: Already playing this episode');
          // Just show the mini player if it's hidden
          setAndPersistPlayerState({
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
      setAndPersistPlayerState({
        ...playerStore.get(),
        currentEpisode: episode,
        isPlaying: false,
        progress: 0,
        duration: episode.durationSec,
        isExpanded: false,  // Changed to false - show mini player by default
        isLoading: true,
      });

      // Load and play the audio (use downloaded file if available)
      if (episode.audioUrl) {
        // Check if lecture is downloaded, use local file if available
        const playbackUri = downloadsService.getPlaybackUri(episode.id, episode.audioUrl);
        const isOffline = downloadsService.isDownloaded(episode.id);

        if (isOffline) {
          console.log('🔊 PlayerStore: Loading from DOWNLOADED file:', playbackUri);
        } else {
          console.log('🔊 PlayerStore: Loading from REMOTE URL:', playbackUri);
        }

        // loadAudio now properly waits for the audio to be ready
        await audioControls.loadAudio(playbackUri);

        console.log('▶️ PlayerStore: Starting playback...');
        audioControls.play();

        // Add to history
        try {
          await historyService.addToHistory(episode, 0);
          console.log('📚 Added lecture to history');
        } catch (error) {
          console.error('Failed to add to history:', error);
          // Don't block playback if history fails
        }

        // Update state after successful play
        console.log('✅ PlayerStore: Updating state to playing...');
        setAndPersistPlayerState({
          ...playerStore.get(),
          isPlaying: true,
          isLoading: false,
          isDownloaded: isOffline,
        });
      } else {
        console.error('❌ PlayerStore: No audio URL provided!');
        captureSentryException(
          new Error('No audio URL provided for episode'),
          { episodeId: episode.id, title: episode.title }
        );
      }
    } catch (error: any) {
      console.error('❌ PlayerStore: Failed to play episode:', error);
      console.error('Episode details:', { id: episode.id, title: episode.title, audioUrl: episode.audioUrl });

      // Show user-friendly error message
      const errorMessage = error.message?.includes('timeout')
        ? 'Audio loading timed out. Please check your internet connection and try again.'
        : 'Failed to play audio. Please try again.';

      // Report playback errors to Sentry
      captureSentryException(error, {
        episodeId: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        errorType: error.message?.includes('timeout') ? 'loading_timeout' : 'playback_failed',
        errorMessage: error.message,
      });

      // Update state to show error
      playerStore.set({
        ...playerStore.get(),
        isPlaying: false,
        isLoading: false,
        currentEpisode: episode, // Keep episode info to allow retry
      });

      // Could show alert to user here if needed
      console.warn('⚠️ User message:', errorMessage);
    }
  }, []); // Empty deps - function only uses module-level audioControls and stable playerStore.get()

  const togglePlayPause = () => {
    if (!audioControls) {
      console.error('❌ PlayerStore: Audio controls not initialized');
      return;
    }

    try {
      const currentState = playerStore.get();
      if (!currentState.currentEpisode) return;

      // Set loading state immediately for better UX
      playerStore.set({
        ...currentState,
        isLoading: true,
      });

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
      setAndPersistPlayerState({
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
    setAndPersistPlayerState({
      ...playerStore.get(),
      isExpanded: true,
    });
  };

  const minimizePlayer = () => {
    setAndPersistPlayerState({
      ...playerStore.get(),
      isExpanded: false,
    });
  };

  const likeEpisode = (episodeId: string) => {
    const currentState = playerStore.get();
    if (currentState.currentEpisode?.id === episodeId) {
      setAndPersistPlayerState({
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
      setAndPersistPlayerState({
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
      setAndPersistPlayerState({
        ...playerStore.get(),
        volume: clampedVolume,
      });
      audioControls.setVolume(clampedVolume);
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  };

  const setLoading = (isLoading: boolean) => {
    setAndPersistPlayerState({
      ...playerStore.get(),
      isLoading,
    });
  };

  const downloadEpisode = (_episode: Episode) => {
    setAndPersistPlayerState({
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
          setAndPersistPlayerState({
            ...playerStore.get(),
            isDownloading: false,
            isDownloaded: true,
            downloadProgress: 1,
          });
        } else {
          setAndPersistPlayerState({
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
      setAndPersistPlayerState({
        ...initialState,
      });
    } catch (error) {
      console.error('Failed to close player:', error);
      // Reset store even if audio cleanup fails
      setAndPersistPlayerState({
        ...initialState,
      });
    }
  };

  // Queue Management Functions

  /**
   * Play a queue of episodes starting from a specific index
   */
  const playQueue = async (episodes: Episode[], startIndex: number = 0, shuffle: boolean = false) => {
    console.log('🎵 PlayerStore: playQueue called with', episodes.length, 'episodes, startIndex:', startIndex);

    addSentryBreadcrumb(
      'Playing queue',
      'playback',
      { episodeCount: episodes.length, startIndex, shuffle }
    );

    if (episodes.length === 0) {
      console.warn('⚠️ PlayerStore: Cannot play empty queue');
      return;
    }

    try {
      let queue = [...episodes];

      // Shuffle if requested (but keep start episode at index 0)
      if (shuffle) {
        const startEpisode = queue[startIndex];
        const remaining = queue.filter((_, i) => i !== startIndex);
        // Fisher-Yates shuffle
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        queue = [startEpisode, ...remaining];
        startIndex = 0;
      }

      // Update store with queue
      setAndPersistPlayerState({
        ...playerStore.get(),
        queue,
        currentQueueIndex: startIndex,
        isShuffled: shuffle,
      });

      // Play the first episode
      await playEpisode(queue[startIndex]);
    } catch (error) {
      console.error('Failed to play queue:', error);
      captureSentryException(error as Error, { action: 'playQueue', episodeCount: episodes.length });
    }
  };

  /**
   * Play next episode in queue
   */
  const playNext = useCallback(async () => {
    const currentState = playerStore.get();
    const { queue, currentQueueIndex, repeatMode } = currentState;

    console.log('⏭️ PlayerStore: playNext called, currentIndex:', currentQueueIndex, 'queueLength:', queue.length);

    if (queue.length === 0) {
      console.warn('⚠️ PlayerStore: No queue to play next');
      return;
    }

    // Handle repeat one
    if (repeatMode === 'one' && currentState.currentEpisode) {
      console.log('🔂 PlayerStore: Repeat one, replaying current episode');
      await playEpisode(currentState.currentEpisode);
      return;
    }

    let nextIndex = currentQueueIndex + 1;

    // Handle end of queue
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        console.log('🔁 PlayerStore: Repeat all, going back to start');
        nextIndex = 0;
      } else {
        console.log('⏹️ PlayerStore: End of queue reached');
        // Stop playback
        if (audioControls) {
          audioControls.stop();
        }
        setAndPersistPlayerState({
          ...currentState,
          isPlaying: false,
        });
        return;
      }
    }

    // Update index and play
    setAndPersistPlayerState({
      ...currentState,
      currentQueueIndex: nextIndex,
    });

    await playEpisode(queue[nextIndex]);
  }, [playEpisode]);

  /**
   * Play previous episode in queue
   */
  const playPrevious = async () => {
    const currentState = playerStore.get();
    const { queue, currentQueueIndex } = currentState;

    console.log('⏮️ PlayerStore: playPrevious called, currentIndex:', currentQueueIndex);

    if (queue.length === 0) {
      console.warn('⚠️ PlayerStore: No queue to play previous');
      return;
    }

    // If we're more than 3 seconds into the track, restart it
    if (currentState.progress > 3 && currentState.currentEpisode) {
      console.log('🔄 PlayerStore: Restarting current episode');
      if (audioControls) {
        audioControls.seekTo(0);
      }
      return;
    }

    let prevIndex = currentQueueIndex - 1;

    // Handle start of queue
    if (prevIndex < 0) {
      prevIndex = queue.length - 1; // Go to last episode
    }

    // Update index and play
    setAndPersistPlayerState({
      ...currentState,
      currentQueueIndex: prevIndex,
    });

    await playEpisode(queue[prevIndex]);
  };

  /**
   * Add episodes to end of queue
   */
  const addToQueue = (episodes: Episode | Episode[]) => {
    const episodeArray = Array.isArray(episodes) ? episodes : [episodes];
    const currentState = playerStore.get();

    console.log('➕ PlayerStore: Adding', episodeArray.length, 'episodes to queue');

    addSentryBreadcrumb(
      'Adding to queue',
      'playback',
      { episodeCount: episodeArray.length }
    );

    setAndPersistPlayerState({
      ...currentState,
      queue: [...currentState.queue, ...episodeArray],
    });
  };

  /**
   * Remove episode from queue by index
   */
  const removeFromQueue = (index: number) => {
    const currentState = playerStore.get();
    const newQueue = currentState.queue.filter((_, i) => i !== index);

    console.log('➖ PlayerStore: Removing episode at index', index);

    // Adjust current index if necessary
    let newIndex = currentState.currentQueueIndex;
    if (index < currentState.currentQueueIndex) {
      newIndex--;
    } else if (index === currentState.currentQueueIndex) {
      // If we removed the current episode, don't change index
      // (next episode will now be at same index)
    }

    setAndPersistPlayerState({
      ...currentState,
      queue: newQueue,
      currentQueueIndex: newIndex,
    });
  };

  /**
   * Toggle shuffle mode
   */
  const toggleShuffle = () => {
    const currentState = playerStore.get();
    const newShuffleState = !currentState.isShuffled;

    console.log('🔀 PlayerStore: Toggle shuffle:', newShuffleState);

    if (newShuffleState && currentState.queue.length > 0) {
      // Shuffle queue, keeping current episode at current position
      const currentEpisode = currentState.queue[currentState.currentQueueIndex];
      const remaining = currentState.queue.filter((_, i) => i !== currentState.currentQueueIndex);

      // Fisher-Yates shuffle
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      const newQueue = [currentEpisode, ...remaining];

      setAndPersistPlayerState({
        ...currentState,
        queue: newQueue,
        currentQueueIndex: 0,
        isShuffled: true,
      });
    } else {
      // Un-shuffle: restore original order (not implemented yet, just toggle flag)
      setAndPersistPlayerState({
        ...currentState,
        isShuffled: false,
      });
    }
  };

  /**
   * Set repeat mode (off, all, one)
   */
  const setRepeatMode = (mode: 'off' | 'all' | 'one') => {
    console.log('🔁 PlayerStore: Set repeat mode:', mode);

    setAndPersistPlayerState({
      ...playerStore.get(),
      repeatMode: mode,
    });
  };

  /**
   * Clear queue
   */
  const clearQueue = () => {
    console.log('🗑️ PlayerStore: Clearing queue');

    setAndPersistPlayerState({
      ...playerStore.get(),
      queue: [],
      currentQueueIndex: -1,
      isShuffled: false,
    });
  };

  // Set playNext reference for use in AudioProvider
  React.useEffect(() => {
    setPlayNextRef(playNext);
    return () => setPlayNextRef(null);
  }, [playNext]);

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
    // Queue management
    playQueue,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    toggleShuffle,
    setRepeatMode,
    clearQueue,
  };
};
