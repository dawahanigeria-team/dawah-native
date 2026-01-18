import AsyncStorage from "expo-sqlite/kv-store";
import { entity } from "simpler-state";
import type { AudioPlaybackControls } from "../hooks/useAudioPlayback";
import { addSentryBreadcrumb, captureSentryException } from "../services/config/sentry.config";
import { downloadsService } from "../services/downloads.service";
import { historyService } from "../services/history.service";
import { Episode, PlayerState } from "../types/types";
import { logger } from "../utils/logger";

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

const PLAYER_STATE_KEY = "PLAYER_STATE";

// Chain persistence writes to prevent race conditions
let persistenceQueue: Promise<void> = Promise.resolve();

/**
 * Set player state and persist it to AsyncStorage
 * Uses a promise chain to prevent race conditions from rapid state updates
 */
const setAndPersistPlayerState = (newState: Partial<PlayerState>) => {
  const currentState = playerStore.get();
  const updatedState = { ...currentState, ...newState };
  playerStore.set(updatedState);

  // Avoid storing the entire queue, as it can be large
  const persistableState = { ...updatedState, queue: [] };

  // Chain writes to prevent out-of-order persistence
  persistenceQueue = persistenceQueue
    .then(() => AsyncStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(persistableState)))
    .catch(error => {
      logger.error('Failed to persist player state', error as Error);
    });
};

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

/**
 * Build lock screen info from an episode
 */
function buildLockScreenInfo(episode: Episode): { title: string; artist: string; artwork: string } {
  return {
    title: episode.title,
    artist: episode.lecturerName || 'dawahnigeria',
    artwork: episode.coverUrl || '',
  };
}

// ----------------------------------------------------------------------
// ACTION IMPLEMENTATIONS
// These functions operate on the store but do NOT cause subscriptions
// Defined as standalone constants to ensure closure capture
// ----------------------------------------------------------------------

const playEpisode = async (episode: Episode) => {
  logger.debug('🎮 PlayerStore: playEpisode called with:', episode.title);

  addSentryBreadcrumb(
    `Playing episode: ${episode.title}`,
    'playback',
    { episodeId: episode.id, title: episode.title }
  );

  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'), {
      episodeId: episode.id,
      title: episode.title,
    });
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
      logger.debug('📱 PlayerStore: Same episode already loaded');

      // If it's paused, just resume
      if (!currentState.isPlaying) {
        logger.debug('▶️ PlayerStore: Resuming playback...');
        audioControls.play();
        audioControls.setLockScreenInfo(buildLockScreenInfo(episode));
        setAndPersistPlayerState({
          ...currentState,
          isPlaying: true,
          isExpanded: false,
        });
      } else {
        logger.debug('⏸️ PlayerStore: Already playing this episode');
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
      logger.debug('🛑 PlayerStore: Stopping current episode...');
      audioControls.stop();
      audioControls.unload();
    }

    // Set loading state
    logger.debug('📊 PlayerStore: Setting initial state...');
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
        logger.debug('🔊 PlayerStore: Loading from DOWNLOADED file:', playbackUri);
      } else {
        logger.debug('🔊 PlayerStore: Loading from REMOTE URL:', playbackUri);
      }

      // loadAudio now properly waits for the audio to be ready
      await audioControls.loadAudio(playbackUri);

      logger.debug('▶️ PlayerStore: Starting playback...');
      audioControls.play();

      // Set lock screen controls after playback starts (iOS requires active playback)
      audioControls.setLockScreenInfo(buildLockScreenInfo(episode));

      // Add to history
      try {
        await historyService.addToHistory(episode, 0);
        logger.debug('📚 Added lecture to history');
      } catch (error) {
        logger.error('Failed to add to history', error as Error, {
          episodeId: episode.id,
        });
        // Don't block playback if history fails
      }

      // Update state after successful play
      logger.debug('✅ PlayerStore: Updating state to playing...');
      setAndPersistPlayerState({
        ...playerStore.get(),
        isPlaying: true,
        isLoading: false,
        isDownloaded: isOffline,
      });
    } else {
      logger.error('❌ PlayerStore: No audio URL provided!', new Error('No audio URL provided for episode'), {
        episodeId: episode.id,
        title: episode.title,
      });
      captureSentryException(
        new Error('No audio URL provided for episode'),
        { episodeId: episode.id, title: episode.title }
      );
    }
  } catch (error: any) {
    logger.error('❌ PlayerStore: Failed to play episode', error as Error, {
      episodeId: episode.id,
      title: episode.title,
      audioUrl: episode.audioUrl,
    });

    const errorMessage = error.message?.includes('timeout')
      ? 'Audio loading timed out. Please check your internet connection and try again.'
      : 'Failed to play audio. Please try again.';

    captureSentryException(error, {
      episodeId: episode.id,
      title: episode.title,
      audioUrl: episode.audioUrl,
      errorType: error.message?.includes('timeout') ? 'loading_timeout' : 'playback_failed',
      errorMessage: error.message,
    });

    playerStore.set({
      ...playerStore.get(),
      isPlaying: false,
      isLoading: false,
      currentEpisode: episode,
    });

    logger.warn('⚠️ User message:', errorMessage);
  }
};

const playNext = async () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const { currentQueueIndex, repeatMode } = currentState;

  logger.debug('⏭️ PlayerStore: playNext called, currentIndex:', currentQueueIndex, 'queueLength:', queue.length);

  if (queue.length === 0) {
    logger.warn('⚠️ PlayerStore: No queue to play next');
    return;
  }

  if (repeatMode === 'one' && currentState.currentEpisode) {
    logger.debug('🔂 PlayerStore: Repeat one, replaying current episode');
    await playEpisode(currentState.currentEpisode);
    return;
  }

  let nextIndex = currentQueueIndex + 1;

  if (nextIndex >= queue.length) {
    if (repeatMode === 'all') {
      logger.debug('🔁 PlayerStore: Repeat all, going back to start');
      nextIndex = 0;
    } else {
      logger.debug('⏹️ PlayerStore: End of queue reached');
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

  setAndPersistPlayerState({
    ...currentState,
    currentQueueIndex: nextIndex,
  });

  await playEpisode(queue[nextIndex]);
};

const playPrevious = async () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const { currentQueueIndex } = currentState;

  logger.debug('⏮️ PlayerStore: playPrevious called, currentIndex:', currentQueueIndex);

  if (queue.length === 0) {
    logger.warn('⚠️ PlayerStore: No queue to play previous');
    return;
  }

  if (currentState.progress > 3 && currentState.currentEpisode) {
    logger.debug('🔄 PlayerStore: Restarting current episode');
    if (audioControls) {
      audioControls.seekTo(0);
    }
    return;
  }

  let prevIndex = currentQueueIndex - 1;

  if (prevIndex < 0) {
    prevIndex = queue.length - 1;
  }

  setAndPersistPlayerState({
    ...currentState,
    currentQueueIndex: prevIndex,
  });

  await playEpisode(queue[prevIndex]);
};

const playQueue = async (episodes: Episode[], startIndex: number = 0, shuffle: boolean = false) => {
  logger.debug('🎵 PlayerStore: playQueue called with', episodes.length, 'episodes, startIndex:', startIndex);

  addSentryBreadcrumb(
    'Playing queue',
    'playback',
    { episodeCount: episodes.length, startIndex, shuffle }
  );

  if (episodes.length === 0) {
    logger.warn('⚠️ PlayerStore: Cannot play empty queue');
    return;
  }

  try {
    let queue = [...episodes];

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

    setAndPersistPlayerState({
      ...playerStore.get(),
      queue,
      currentQueueIndex: startIndex,
      isShuffled: shuffle,
    });

    await playEpisode(queue[startIndex]);
  } catch (error) {
    logger.error('Failed to play queue', error as Error);
    captureSentryException(error as Error, { action: 'playQueue', episodeCount: episodes.length });
  }
};

const togglePlayPause = () => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    const currentState = playerStore.get();
    if (!currentState.currentEpisode) return;

    playerStore.set({
      ...currentState,
      isLoading: true,
    });

    audioControls.togglePlayPause();
  } catch (error) {
    logger.error('Failed to toggle play/pause', error as Error);
  }
};

const setProgress = (progress: number) => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    setAndPersistPlayerState({
      ...playerStore.get(),
      progress,
    });
    audioControls.seekTo(progress);
  } catch (error) {
    logger.error('Failed to set progress', error as Error);
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
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    audioControls.seekForward(seconds);
  } catch (error) {
    logger.error('Failed to seek forward', error as Error);
  }
};

const seekBackward = (seconds: number = 15) => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    audioControls.seekBackward(seconds);
  } catch (error) {
    logger.error('Failed to seek backward', error as Error);
  }
};

const setPlaybackSpeed = (speed: number) => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    setAndPersistPlayerState({
      ...playerStore.get(),
      playbackSpeed: speed,
    });
    audioControls.setPlaybackRate(speed);
  } catch (error) {
    logger.error('Failed to set playback speed', error as Error);
  }
};

const setVolume = (volume: number) => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
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
    logger.error('Failed to set volume', error as Error);
  }
};

const setLoading = (isLoading: boolean) => {
  setAndPersistPlayerState({
    ...playerStore.get(),
    isLoading,
  });
};

const downloadEpisode = (_episode: Episode) => {
  const state = playerStore.get();
  setAndPersistPlayerState({
    ...state,
    isDownloading: true,
    downloadProgress: 0,
  });

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
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    audioControls.stop();
    audioControls.unload();

    setAndPersistPlayerState({
      ...initialState,
    });
  } catch (error) {
    logger.error('Failed to close player', error as Error);
    setAndPersistPlayerState({
      ...initialState,
    });
  }
};

const addToQueue = (episodes: Episode | Episode[]) => {
  const episodeArray = Array.isArray(episodes) ? episodes : [episodes];
  const currentState = playerStore.get();
  const existingQueue = Array.isArray(currentState.queue) ? currentState.queue : [];

  logger.debug('➕ PlayerStore: Adding', episodeArray.length, 'episodes to queue');

  addSentryBreadcrumb(
    'Adding to queue',
    'playback',
    { episodeCount: episodeArray.length }
  );

  setAndPersistPlayerState({
    ...currentState,
    queue: [...existingQueue, ...episodeArray],
  });
};

const removeFromQueue = (index: number) => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const newQueue = queue.filter((_, i) => i !== index);

  logger.debug('➖ PlayerStore: Removing episode at index', index);

  let newIndex = currentState.currentQueueIndex;
  if (index < currentState.currentQueueIndex) {
    newIndex--;
  } else if (index === currentState.currentQueueIndex) {
  }

  setAndPersistPlayerState({
    ...currentState,
    queue: newQueue,
    currentQueueIndex: newIndex,
  });
};

const toggleShuffle = () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const newShuffleState = !currentState.isShuffled;

  logger.debug('🔀 PlayerStore: Toggle shuffle:', newShuffleState);

  if (newShuffleState && queue.length > 0) {
    const currentEpisode = queue[currentState.currentQueueIndex];
    const remaining = queue.filter((_, i) => i !== currentState.currentQueueIndex);

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
    setAndPersistPlayerState({
      ...currentState,
      isShuffled: false,
    });
  }
};

const setRepeatMode = (mode: 'off' | 'all' | 'one') => {
  logger.debug('🔁 PlayerStore: Set repeat mode:', mode);

  setAndPersistPlayerState({
    ...playerStore.get(),
    repeatMode: mode,
  });
};

const clearQueue = () => {
  logger.debug('🗑️ PlayerStore: Clearing queue');

  setAndPersistPlayerState({
    ...playerStore.get(),
    queue: [],
    currentQueueIndex: -1,
    isShuffled: false,
  });
};

const actions = {
  playEpisode,
  playNext,
  playPrevious,
  playQueue,
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
  addToQueue,
  removeFromQueue,
  toggleShuffle,
  setRepeatMode,
  clearQueue,
};

// Keep playNextRef available for AudioProvider without relying on a hook.
setPlayNextRef(actions.playNext);

/**
 * Hook to access player actions without subscribing to state changes.
 * Use this in components that only need to control playback but don't need to render progress.
 */
export const usePlayerActions = () => {
  return actions;
};

/**
 * Hook to access player state and actions.
 * Use this when you need both state (like progress) and actions.
 */
export const usePlayerStore = () => {
  // Get state from the store. simpler-state's .use() is a React hook
  // and should not be wrapped in try-catch as that can corrupt React's
  // internal hook tracking (causing areHookInputsEqual to fail).
  const rawState = playerStore.use();

  // Merge with initialState to ensure all properties are always defined.
  // This prevents "Cannot read property 'X' of undefined" errors when the
  // store returns undefined or a partial state.
  const state: PlayerState = {
    ...initialState,
    ...(rawState || {}),
    // Ensure queue is always an array (extra safety)
    queue: Array.isArray(rawState?.queue) ? rawState.queue : [],
  };

  return {
    ...state,
    ...actions
  };
};
