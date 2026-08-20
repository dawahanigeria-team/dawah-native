import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from "expo-sqlite/kv-store";
import { entity } from "simpler-state";
import type { AudioPlaybackControls } from "../hooks/useAudioPlayback";
import { addSentryBreadcrumb, captureSentryException } from "../services/config/sentry.config";
import { downloadsService } from "../services/downloads.service";
import TrackPlayer, { RepeatMode, State } from '../services/expoTrackPlayerCompat';
import { historyService } from "../services/history.service";
import {
  clearQueueSnapshot,
  saveQueueSnapshot,
  toQueueEpisodeSnapshot,
} from "../services/playerQueue.service";
import { buildPlaylistKey, buildQueue } from "../services/trackPlayerQueue.service";
import { ensureTrackPlayerReady } from "../services/trackPlayerReady.service";
import { Episode, PlayerState } from "../types/types";
import { logger } from "../utils/logger";
import { analytics } from "../services/analytics.service";
import { resolvePlaybackSpeakerName } from "../utils/speakerName";

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
  errorMessage: null,
  queue: [],
  originalQueue: [],
  currentQueueIndex: -1,
  isShuffled: false,
  repeatMode: 'off',
  sleepTimerEndsAt: null,
  sleepTimerEndOfTrack: false,
};

export const playerStore = entity(initialState);

const PLAYER_STATE_KEY = "PLAYER_STATE";

// Chain persistence writes to prevent race conditions
let persistenceQueue: Promise<void> = Promise.resolve();

const buildPersistablePlayerState = (state: PlayerState): PlayerState => ({
  ...state,
  queue: [],
  originalQueue: [],
});

/**
 * Set player state and persist it to AsyncStorage
 * Uses a promise chain to prevent race conditions from rapid state updates
 */
const setAndPersistPlayerState = (newState: Partial<PlayerState>) => {
  const currentState = playerStore.get();
  const updatedState = { ...currentState, ...newState };
  playerStore.set(updatedState);

  // Avoid storing the full queue payloads, as they can be large.
  const persistableState = buildPersistablePlayerState(updatedState);

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

export const resolveEpisodeArtistName = (episode: Episode): string => {
  return resolvePlaybackSpeakerName(episode);
};

/**
 * Build lock screen info from an episode
 */
function buildLockScreenInfo(episode: Episode): { title: string; artist: string; artwork: string } {
  return {
    title: episode.title,
    artist: resolveEpisodeArtistName(episode),
    artwork: episode.coverUrl || '',
  };
}

// Every explicit content selection gets a monotonically increasing token.
// Long-running startup restoration and older queue loads must never overwrite
// a lecture the listener selected afterwards.
let currentPlayRequestId = 0;
const beginPlaybackRequest = (): number => ++currentPlayRequestId;
export const getPlaybackRequestId = (): number => currentPlayRequestId;
const PLAYBACK_START_TIMEOUT_MS = 20000;
const PLAYBACK_BUFFERING_GRACE_MS = 45000;
const PLAYBACK_POLL_INTERVAL_MS = 500;
const PLAYBACK_RECOVERY_INTERVAL_MS = 3000;
const PLAYBACK_SOURCE_CHECK_TIMEOUT_MS = 10000;
const HTTP_URL_REGEX = /^https?:\/\//i;
const AUDIO_SOURCE_UNAVAILABLE_MESSAGE = 'Audio source unavailable';
const AUDIO_SOURCE_UNAVAILABLE_USER_MESSAGE = 'This audio file is currently unavailable. Please try another lecture.';

const resolvePlaybackUri = (episode: Episode): string => {
  if (!episode.audioUrl) {
    return '';
  }

  return downloadsService.getPlaybackUri(episode.id, episode.audioUrl);
};

const sanitizeRemotePlaybackUri = (uri: string): string => {
  if (!uri || !HTTP_URL_REGEX.test(uri)) {
    return uri;
  }

  const encodePathSegment = (segment: string): string => {
    try {
      return encodeURIComponent(decodeURIComponent(segment));
    } catch {
      return encodeURIComponent(segment);
    }
  };

  try {
    const url = new URL(uri);
    url.pathname = url.pathname
      .split('/')
      .map(encodePathSegment)
      .join('/');
    return url.toString().replace(/'/g, '%27');
  } catch {
    return encodeURI(uri).replace(/'/g, '%27');
  }
};

const assertRemotePlaybackSourceAvailable = async (uri: string): Promise<void> => {
  if (!HTTP_URL_REGEX.test(uri)) {
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PLAYBACK_SOURCE_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(sanitizeRemotePlaybackUri(uri), {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: controller.signal,
    });

    if (response.status === 404 || response.status === 410) {
      throw new Error(AUDIO_SOURCE_UNAVAILABLE_MESSAGE);
    }

    if (response.status >= 400 && response.status !== 416) {
      throw new Error(`Audio source request failed with status ${response.status}`);
    }
  } catch (error) {
    const err = error as Error;
    if (err.name === 'AbortError') {
      return;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const waitForPlaybackReady = async (timeoutMs: number, requestId?: number) => {
  const start = Date.now();
  let lastRecoveryAttemptAt = start;
  let recoveryAttempts = 0;
  let effectiveTimeoutMs = timeoutMs;

  while (Date.now() - start < effectiveTimeoutMs) {
    if (requestId !== undefined && requestId !== currentPlayRequestId) {
      throw new Error('Playback superseded');
    }

    const playbackState = await TrackPlayer.getPlaybackState();
    const progress = await TrackPlayer.getProgress();
    const state =
      typeof playbackState === 'object' && playbackState !== null && 'state' in playbackState
        ? playbackState.state
        : playbackState;
    const hasStarted = Number.isFinite(progress.position) && progress.position > 0;
    if (state === State.Playing || hasStarted) {
      return;
    }
    const elapsedMs = Date.now() - start;
    if (
      (state === State.Buffering || state === State.Loading) &&
      effectiveTimeoutMs === timeoutMs &&
      elapsedMs >= timeoutMs - PLAYBACK_POLL_INTERVAL_MS
    ) {
      const netState = await NetInfo.fetch();
      if (netState.isConnected !== false && netState.isInternetReachable !== false) {
        effectiveTimeoutMs = PLAYBACK_BUFFERING_GRACE_MS;
      }
    }
    if (state === State.Error) {
      throw new Error('Audio playback error');
    }

    const now = Date.now();
    const isStalled =
      state === State.None ||
      state === State.Ready ||
      state === State.Paused ||
      state === State.Stopped;

    if (isStalled && now - lastRecoveryAttemptAt >= PLAYBACK_RECOVERY_INTERVAL_MS) {
      lastRecoveryAttemptAt = now;
      recoveryAttempts += 1;

      try {
        logger.warn('Playback startup stalled, retrying play()', {
          requestId,
          state,
          recoveryAttempts,
          position: progress.position,
        });
        await TrackPlayer.play();
      } catch (error) {
        logger.warn('Playback startup recovery attempt failed', {
          requestId,
          state,
          recoveryAttempts,
          error: (error as Error).message,
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, PLAYBACK_POLL_INTERVAL_MS));
  }

  throw new Error('Audio loading timeout');
};

const persistQueueSnapshot = (state: PlayerState) => {
  if (!state.queue.length || state.currentQueueIndex < 0) {
    void clearQueueSnapshot();
    return;
  }

  const currentEpisode = state.currentEpisode ?? state.queue[state.currentQueueIndex];
  void saveQueueSnapshot({
    trackIds: state.queue.map((item) => String(item.id)),
    originalTrackIds: state.originalQueue.length > 0
      ? state.originalQueue.map((item) => String(item.id))
      : undefined,
    currentIndex: state.currentQueueIndex,
    position: state.progress,
    playbackRate: state.playbackSpeed,
    repeatMode: state.repeatMode,
    isShuffled: state.isShuffled,
    episodes: state.queue.map(toQueueEpisodeSnapshot),
    originalEpisodes: state.originalQueue.length > 0
      ? state.originalQueue.map(toQueueEpisodeSnapshot)
      : undefined,
    currentTrack: currentEpisode
      ? {
        id: String(currentEpisode.id),
        title: currentEpisode.title,
        artist: resolveEpisodeArtistName(currentEpisode),
        artwork: currentEpisode.coverUrl,
      }
      : undefined,
  });
};

// ----------------------------------------------------------------------
// ACTION IMPLEMENTATIONS
// These functions operate on the store but do NOT cause subscriptions
// Defined as standalone constants to ensure closure capture
// ----------------------------------------------------------------------

const playEpisode = async (episode: Episode) => {
  const requestId = beginPlaybackRequest();
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
    const wasPlaying = playerStore.get().isPlaying;

    setAndPersistPlayerState({
      ...playerStore.get(),
      isLoading: true,
      isPlaying: false,
      errorMessage: null,
    });

    const currentState = playerStore.get();

    // Check if we're already playing this episode
    if (currentState.currentEpisode?.id === episode.id) {
      logger.debug('📱 PlayerStore: Same episode already loaded');

      // If it was paused, resume; if it was playing, just show mini player
      if (!wasPlaying) {
        logger.debug('▶️ PlayerStore: Resuming playback...');
        await TrackPlayer.play();
        if (audioControls) {
          audioControls.setLockScreenInfo(buildLockScreenInfo(episode));
        }
        const nextState = {
          ...currentState,
          isPlaying: true,
          isExpanded: false,
        };
        setAndPersistPlayerState(nextState);
        persistQueueSnapshot(nextState);
      } else {
        logger.debug('⏸️ PlayerStore: Already playing this episode');
        setAndPersistPlayerState({
          ...currentState,
          isPlaying: true,
          isLoading: false,
          isExpanded: false,
        });
      }
      return;
    }

    // Set loading state
    logger.debug('📊 PlayerStore: Setting initial state...');
    const selectedEpisodeState = {
      ...playerStore.get(),
      queue: [episode],
      originalQueue: [],
      currentQueueIndex: 0,
      currentEpisode: episode,
      isPlaying: false,
      progress: 0,
      duration: episode.durationSec,
      isExpanded: false,
      isLoading: true,
      isShuffled: false,
    };
    setAndPersistPlayerState(selectedEpisodeState);
    persistQueueSnapshot(selectedEpisodeState);

    // Load and play the audio (use downloaded file if available)
    if (episode.audioUrl) {
      const playbackUri = resolvePlaybackUri(episode);
      const isOffline = downloadsService.isDownloaded(episode.id);

      if (isOffline) {
        logger.debug('🔊 PlayerStore: Loading from DOWNLOADED file:', playbackUri);
      } else {
        logger.debug('🔊 PlayerStore: Loading from REMOTE URL:', playbackUri);
        await assertRemotePlaybackSourceAvailable(playbackUri);
      }

      const queue = [episode];
      const tracks = buildQueue(queue, resolvePlaybackUri);

      await ensureTrackPlayerReady();
      if (requestId !== currentPlayRequestId) return;

      await TrackPlayer.reset();
      await TrackPlayer.add(tracks, { activate: false });
      await TrackPlayer.setPlaylistKey(buildPlaylistKey(queue));
      await TrackPlayer.skip(0);

      if (requestId !== currentPlayRequestId) return;

      logger.debug('▶️ PlayerStore: Starting playback...');
      await TrackPlayer.play();
      await waitForPlaybackReady(PLAYBACK_START_TIMEOUT_MS, requestId);

      if (requestId !== currentPlayRequestId) return;

      audioControls?.setLockScreenInfo(buildLockScreenInfo(episode));

      // Add to history
      try {
        await historyService.addToHistory(episode, 0);
        logger.debug('📚 Added lecture to history');
      } catch (error) {
        logger.error('Failed to add to history', error as Error, {
          episodeId: episode.id,
        });
      }

      // Update state after successful play
      logger.debug('✅ PlayerStore: Updating state to playing...');
      const nextState = {
        ...playerStore.get(),
        queue,
        originalQueue: [],
        currentQueueIndex: 0,
        currentEpisode: episode,
        isPlaying: true,
        isLoading: false,
        isDownloaded: isOffline,
        isShuffled: false,
        errorMessage: null,
      };
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
      analytics.capture('lecture_played', {
        lecture_id: String(episode.id),
        lecture_title: episode.title,
        lecturer: resolveEpisodeArtistName(episode),
        duration_seconds: episode.durationSec || null,
        source: isOffline ? 'download' : 'stream',
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
  } catch (error) {
    if (requestId !== currentPlayRequestId) return;

    const err = error as Error;
    const message = err?.message ?? '';
    const isTimeout = message.toLowerCase().includes('timeout');
    const isSourceUnavailable = message === AUDIO_SOURCE_UNAVAILABLE_MESSAGE;

    if (isSourceUnavailable) {
      logger.warn('PlayerStore: Audio source unavailable', {
        episodeId: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
      });
    } else {
      logger.error('❌ PlayerStore: Failed to play episode', err, {
        episodeId: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
      });
    }

    let errorMessage = 'Failed to play audio. Please try again.';

    if (isTimeout) {
      try {
        const netState = await NetInfo.fetch();
        if (netState.isConnected === false || netState.isInternetReachable === false) {
          errorMessage = 'No internet connection. Please check your network and try again.';
        } else {
          errorMessage = 'Audio is taking longer than usual to load. Please try again.';
        }
      } catch {
        errorMessage = 'Audio is taking longer than usual to load. Please try again.';
      }
    }
    if (isSourceUnavailable) {
      errorMessage = AUDIO_SOURCE_UNAVAILABLE_USER_MESSAGE;
    }

    if (!isTimeout && !isSourceUnavailable) {
      captureSentryException(err, {
        episodeId: episode.id,
        title: episode.title,
        audioUrl: episode.audioUrl,
        errorType: 'playback_failed',
        errorMessage: message,
      });
    }

    playerStore.set({
      ...playerStore.get(),
      isPlaying: false,
      isLoading: false,
      currentEpisode: episode,
      errorMessage,
    });
  }
};

const playNext = async () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const { repeatMode } = currentState;
  const shouldResumePlayback = currentState.isPlaying;

  logger.debug('⏭️ PlayerStore: playNext called, currentIndex:', currentState.currentQueueIndex, 'queueLength:', queue.length);

  if (queue.length === 0) {
    logger.warn('⚠️ PlayerStore: No queue to play next');
    return;
  }

  if (repeatMode === 'one' && currentState.currentEpisode) {
    logger.debug('🔂 PlayerStore: Repeat one, replaying current episode');
    try {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } catch (error) {
      logger.error('Failed to restart current episode', error as Error);
    }
    const nextState = {
      ...currentState,
      isPlaying: true,
      progress: 0,
    };
    setAndPersistPlayerState(nextState);
    persistQueueSnapshot(nextState);
    return;
  }

  try {
    await ensureTrackPlayerReady();
    await TrackPlayer.skipToNext();
    if (shouldResumePlayback) {
      await TrackPlayer.play();
    }
    const nextIndex = await TrackPlayer.getActiveTrackIndex();

    if (nextIndex !== null && queue[nextIndex]) {
      const nextState = {
        ...currentState,
        currentQueueIndex: nextIndex,
        currentEpisode: queue[nextIndex],
        isPlaying: shouldResumePlayback,
        progress: 0,
      };
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
      return;
    }
  } catch (error) {
    logger.error('Failed to skip to next track', error as Error);
  }

  if (repeatMode === 'all' && queue.length > 0) {
    try {
      await TrackPlayer.skip(0);
      if (shouldResumePlayback) {
        await TrackPlayer.play();
      }
      const nextState = {
        ...currentState,
        currentQueueIndex: 0,
        currentEpisode: queue[0],
        isPlaying: shouldResumePlayback,
        progress: 0,
      };
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
      return;
    } catch (error) {
      logger.error('Failed to repeat queue', error as Error);
    }
  }

  logger.debug('⏹️ PlayerStore: End of queue reached');
  if (audioControls) {
    audioControls.stop();
  }
  setAndPersistPlayerState({
    ...currentState,
    isPlaying: false,
  });
};

const playPrevious = async () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const shouldResumePlayback = currentState.isPlaying;

  logger.debug('⏮️ PlayerStore: playPrevious called, currentIndex:', currentState.currentQueueIndex);

  if (queue.length === 0) {
    logger.warn('⚠️ PlayerStore: No queue to play previous');
    return;
  }

  if (currentState.progress > 3 && currentState.currentEpisode) {
    logger.debug('🔄 PlayerStore: Restarting current episode');
    try {
      await TrackPlayer.seekTo(0);
      const nextState = {
        ...currentState,
        isPlaying: shouldResumePlayback,
        progress: 0,
      };
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
    } catch (error) {
      logger.error('Failed to restart current episode', error as Error);
    }
    return;
  }

  try {
    await ensureTrackPlayerReady();
    await TrackPlayer.skipToPrevious();
    if (shouldResumePlayback) {
      await TrackPlayer.play();
    }
    const prevIndex = await TrackPlayer.getActiveTrackIndex();

    if (prevIndex !== null && queue[prevIndex]) {
      const nextState = {
        ...currentState,
        currentQueueIndex: prevIndex,
        currentEpisode: queue[prevIndex],
        isPlaying: shouldResumePlayback,
        progress: 0,
      };
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
    }
  } catch (error) {
    logger.error('Failed to skip to previous track', error as Error);
  }
};

const playQueue = async (episodes: Episode[], startIndex: number = 0, shuffle: boolean = false) => {
  const requestId = beginPlaybackRequest();
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
    // Store original queue order before any shuffling
    const originalQueue = [...episodes];
    let queue = [...episodes];
    const safeStartIndex = Math.max(0, Math.min(startIndex, queue.length - 1));

    if (shuffle) {
      const startEpisode = queue[safeStartIndex];
      const remaining = queue.filter((_, i) => i !== safeStartIndex);
      // Fisher-Yates shuffle
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      queue = [startEpisode, ...remaining];
      startIndex = 0;
    } else {
      startIndex = safeStartIndex;
    }

    const filteredQueue = queue.filter((episode) => resolvePlaybackUri(episode));
    const filteredOriginalQueue = originalQueue.filter((episode) => resolvePlaybackUri(episode));
    if (filteredQueue.length === 0) {
      logger.error('No valid tracks with audio URLs', new Error('No playable tracks'));
      return;
    }

    const targetEpisode = queue[startIndex];
    const filteredStartIndex = targetEpisode
      ? filteredQueue.findIndex((episode) => String(episode.id) === String(targetEpisode.id))
      : 0;
    const safeFilteredStartIndex = filteredStartIndex >= 0 ? filteredStartIndex : 0;

    const tracks = buildQueue(filteredQueue, resolvePlaybackUri);
    if (tracks.length === 0) {
      logger.error('No valid tracks with audio URLs', new Error('No playable tracks'));
      return;
    }

    await assertRemotePlaybackSourceAvailable(tracks[safeFilteredStartIndex].url);
    if (requestId !== currentPlayRequestId) return;

    await ensureTrackPlayerReady();
    if (requestId !== currentPlayRequestId) return;
    await TrackPlayer.reset();
    if (requestId !== currentPlayRequestId) return;
    await TrackPlayer.add(tracks, { activate: false });
    if (requestId !== currentPlayRequestId) return;
    await TrackPlayer.setPlaylistKey(buildPlaylistKey(filteredQueue));
    if (requestId !== currentPlayRequestId) return;
    await TrackPlayer.skip(safeFilteredStartIndex);
    if (requestId !== currentPlayRequestId) return;
    await TrackPlayer.play();
    await waitForPlaybackReady(PLAYBACK_START_TIMEOUT_MS, requestId);
    if (requestId !== currentPlayRequestId) return;

    const nextState = {
      ...playerStore.get(),
      queue: filteredQueue,
      originalQueue: filteredOriginalQueue,
      currentQueueIndex: safeFilteredStartIndex,
      currentEpisode: filteredQueue[safeFilteredStartIndex],
      isShuffled: shuffle,
      isPlaying: true,
      isLoading: false,
      progress: 0,
    };
    setAndPersistPlayerState(nextState);
    persistQueueSnapshot(nextState);
  } catch (error) {
    if (requestId !== currentPlayRequestId) return;
    logger.error('Failed to play queue', error as Error);
    captureSentryException(error as Error, { action: 'playQueue', episodeCount: episodes.length });
    setAndPersistPlayerState({
      ...playerStore.get(),
      isPlaying: false,
      isLoading: false,
      errorMessage: 'Failed to play audio. Please try again.',
    });
  }
};

const togglePlayPause = async () => {
  try {
    const currentState = playerStore.get();
    if (!currentState.currentEpisode) return;

    playerStore.set({
      ...currentState,
      isLoading: true,
    });

    // Use TrackPlayer for playback control to ensure correct player instance
    if (currentState.isPlaying) {
      await TrackPlayer.pause();
      analytics.capture('lecture_paused', {
        lecture_id: String(currentState.currentEpisode.id),
        position_seconds: Math.round(currentState.progress),
      });
    } else {
      const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeTrackIndex !== currentState.currentQueueIndex) {
        await TrackPlayer.skip(currentState.currentQueueIndex);
        if (currentState.progress > 0) {
          await TrackPlayer.seekTo(currentState.progress);
        }
      }
      await TrackPlayer.play();
      analytics.capture('lecture_played', {
        lecture_id: String(currentState.currentEpisode.id),
        lecture_title: currentState.currentEpisode.title,
        lecturer: resolveEpisodeArtistName(currentState.currentEpisode),
        duration_seconds: currentState.duration || null,
        source: currentState.isDownloaded ? 'download' : 'stream',
        resumed: true,
      });
    }

    playerStore.set({
      ...playerStore.get(),
      isLoading: false,
    });
  } catch (error) {
    logger.error('Failed to toggle play/pause', error as Error);
    playerStore.set({
      ...playerStore.get(),
      isLoading: false,
    });
  }
};

const setProgress = async (progress: number) => {
  try {
    const nextState = {
      ...playerStore.get(),
      progress,
    };
    setAndPersistPlayerState(nextState);
    persistQueueSnapshot(nextState);
    await TrackPlayer.seekTo(progress);
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

const seekForward = async (seconds: number = 15) => {
  try {
    const currentProgress = await TrackPlayer.getProgress();
    const newPosition = Math.min(currentProgress.position + seconds, currentProgress.duration);
    await TrackPlayer.seekTo(newPosition);
  } catch (error) {
    logger.error('Failed to seek forward', error as Error);
  }
};

const seekBackward = async (seconds: number = 15) => {
  try {
    const currentProgress = await TrackPlayer.getProgress();
    const newPosition = Math.max(currentProgress.position - seconds, 0);
    await TrackPlayer.seekTo(newPosition);
  } catch (error) {
    logger.error('Failed to seek backward', error as Error);
  }
};

const setPlaybackSpeed = async (speed: number) => {
  try {
    const nextState = {
      ...playerStore.get(),
      playbackSpeed: speed,
    };
    setAndPersistPlayerState(nextState);
    persistQueueSnapshot(nextState);
    await TrackPlayer.setRate(speed);
  } catch (error) {
    logger.error('Failed to set playback speed', error as Error);
  }
};

const setVolume = async (volume: number) => {
  try {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setAndPersistPlayerState({
      ...playerStore.get(),
      volume: clampedVolume,
    });
    await TrackPlayer.setVolume(clampedVolume);
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

const downloadEpisode = async (episode: Episode) => {
  setAndPersistPlayerState({
    ...playerStore.get(),
    isDownloading: true,
    downloadProgress: 0,
  });

  try {
    await downloadsService.downloadLecture(episode, (progress) => {
      setAndPersistPlayerState({
        ...playerStore.get(),
        downloadProgress: progress.progress,
      });
    });

    setAndPersistPlayerState({
      ...playerStore.get(),
      isDownloading: false,
      isDownloaded: true,
      downloadProgress: 1,
    });
  } catch (error) {
    logger.error('Failed to download episode', error as Error, {
      episodeId: episode.id,
      title: episode.title,
    });
    captureSentryException(error as Error, {
      action: 'downloadEpisode',
      episodeId: episode.id,
    });

    setAndPersistPlayerState({
      ...playerStore.get(),
      isDownloading: false,
      downloadProgress: 0,
    });
  }
};

const closePlayer = () => {
  if (!audioControls) {
    logger.error('❌ PlayerStore: Audio controls not initialized', new Error('Audio controls not initialized'));
    return;
  }

  try {
    audioControls.stop();
    audioControls.unload();
    void TrackPlayer.reset();
    void clearQueueSnapshot();

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

const addToQueue = async (episodes: Episode | Episode[]) => {
  const episodeArray = Array.isArray(episodes) ? episodes : [episodes];
  const currentState = playerStore.get();
  const existingQueue = Array.isArray(currentState.queue) ? currentState.queue : [];

  logger.debug('➕ PlayerStore: Adding', episodeArray.length, 'episodes to queue');

  addSentryBreadcrumb(
    'Adding to queue',
    'playback',
    { episodeCount: episodeArray.length }
  );

  // The TrackPlayer queue only ever receives episodes with a resolvable URL, so the
  // stored queue must be filtered identically or currentQueueIndex drifts past its end.
  const playableEpisodes = episodeArray.filter((episode) => resolvePlaybackUri(episode));
  if (playableEpisodes.length === 0) {
    logger.error('No valid tracks to add to queue', new Error('No playable tracks'));
    return;
  }

  const queue = [...existingQueue, ...playableEpisodes];

  const nextState = {
    ...currentState,
    queue,
  };
  setAndPersistPlayerState(nextState);
  persistQueueSnapshot(nextState);

  const tracks = buildQueue(playableEpisodes, resolvePlaybackUri);

  try {
    await ensureTrackPlayerReady();
    await TrackPlayer.add(tracks, { activate: false });
    await TrackPlayer.setPlaylistKey(buildPlaylistKey(queue));
  } catch (error) {
    logger.error('Failed to add tracks to queue', error as Error);
  }
};

const removeFromQueue = (index: number) => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const newQueue = queue.filter((_, i) => i !== index);

  logger.debug('➖ PlayerStore: Removing episode at index', index);

  let newIndex = currentState.currentQueueIndex;
  let newEpisode: Episode | null = currentState.currentEpisode ?? null;
  if (index < currentState.currentQueueIndex) {
    newIndex--;
  } else if (index === currentState.currentQueueIndex) {
    if (newQueue.length === 0) {
      newIndex = -1;
      newEpisode = null;
    } else if (index >= newQueue.length) {
      newIndex = newQueue.length - 1;
      newEpisode = newQueue[newIndex] ?? null;
    } else {
      newIndex = index;
      newEpisode = newQueue[newIndex] ?? null;
    }
  }

  const nextState = {
    ...currentState,
    queue: newQueue,
    currentQueueIndex: newIndex,
    currentEpisode: newQueue[newIndex] ?? newEpisode,
  };
  setAndPersistPlayerState(nextState);
  persistQueueSnapshot(nextState);

  void ensureTrackPlayerReady()
    .then(() => TrackPlayer.remove(index))
    .catch((error) => logger.error('Failed to remove track from queue', error as Error));
};

const toggleShuffle = async () => {
  const currentState = playerStore.get();
  const queue = Array.isArray(currentState.queue) ? currentState.queue : [];
  const originalQueue = Array.isArray(currentState.originalQueue) ? currentState.originalQueue : [];
  const newShuffleState = !currentState.isShuffled;

  logger.debug('🔀 PlayerStore: Toggle shuffle:', newShuffleState);

  if (newShuffleState && queue.length > 0) {
    // SHUFFLE ON: Keep current track at position 0, shuffle the rest
    const safeIndex =
      currentState.currentQueueIndex >= 0 && currentState.currentQueueIndex < queue.length
        ? currentState.currentQueueIndex
        : 0;
    const currentEpisode = queue[safeIndex];
    const remaining = queue.filter((_, i) => i !== safeIndex);

    // Fisher-Yates shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    const newQueue = [currentEpisode, ...remaining].filter((episode) =>
      resolvePlaybackUri(episode)
    );

    const tracks = buildQueue(newQueue, resolvePlaybackUri);
    if (tracks.length === 0) {
      logger.error('No valid tracks to shuffle', new Error('No playable tracks'));
      return;
    }

    // Store original queue if not already stored
    const originalToStore = originalQueue.length > 0 ? originalQueue : queue;

    const nextState = {
      ...currentState,
      queue: newQueue,
      originalQueue: originalToStore,
      currentQueueIndex: 0,
      currentEpisode: newQueue[0],
      isShuffled: true,
    };

    try {
      await ensureTrackPlayerReady();
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks, { activate: false });
      await TrackPlayer.setPlaylistKey(buildPlaylistKey(newQueue));
      await TrackPlayer.skip(0);
      if (currentState.isPlaying) {
        await TrackPlayer.play();
      }
      await TrackPlayer.seekTo(currentState.progress);
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
    } catch (error) {
      logger.error('Failed to reshuffle queue', error as Error);
    }
  } else if (originalQueue.length > 0) {
    // SHUFFLE OFF: Restore original queue order, continue from current track
    const currentEpisode = currentState.currentEpisode;
    // originalQueue is stored unfiltered, so resolve the resume index against the
    // filtered queue that TrackPlayer actually receives.
    const playableQueue = originalQueue.filter((episode) => resolvePlaybackUri(episode));
    const newIndex = currentEpisode
      ? playableQueue.findIndex((ep) => String(ep.id) === String(currentEpisode.id))
      : 0;
    const safeNewIndex = newIndex >= 0 ? newIndex : 0;

    const tracks = buildQueue(playableQueue, resolvePlaybackUri);
    if (tracks.length === 0) {
      logger.error('No valid tracks to restore', new Error('No playable tracks'));
      return;
    }

    const nextState = {
      ...currentState,
      queue: playableQueue,
      currentQueueIndex: safeNewIndex,
      currentEpisode: playableQueue[safeNewIndex],
      isShuffled: false,
    };

    try {
      await ensureTrackPlayerReady();
      await TrackPlayer.reset();
      await TrackPlayer.add(tracks, { activate: false });
      await TrackPlayer.setPlaylistKey(buildPlaylistKey(playableQueue));
      await TrackPlayer.skip(safeNewIndex);
      if (currentState.isPlaying) {
        await TrackPlayer.play();
      }
      await TrackPlayer.seekTo(currentState.progress);
      setAndPersistPlayerState(nextState);
      persistQueueSnapshot(nextState);
    } catch (error) {
      logger.error('Failed to restore original queue', error as Error);
    }
  } else {
    // No original queue to restore, just toggle the flag
    const nextState = {
      ...currentState,
      isShuffled: false,
    };
    setAndPersistPlayerState(nextState);
    persistQueueSnapshot(nextState);
  }
};

/**
 * Sleep timer.
 *
 * Deliberately not implemented with setTimeout. The timer matters precisely
 * when the app is backgrounded and the screen is off, and that is exactly
 * when the OS throttles or suspends JS timers — a setTimeout scheduled for
 * 30 minutes may fire late or not at all. Instead we record an absolute
 * deadline and check it from the playback progress tick, which keeps firing
 * for as long as audio is playing.
 *
 * Passing null clears the timer.
 */
const setSleepTimer = (minutes: number | null) => {
  const nextState = {
    ...playerStore.get(),
    sleepTimerEndsAt: minutes === null ? null : Date.now() + minutes * 60_000,
    // The two modes are mutually exclusive; choosing a duration cancels
    // "end of lecture" and vice versa.
    sleepTimerEndOfTrack: false,
  };
  setAndPersistPlayerState(nextState);
};

const setSleepTimerEndOfTrack = () => {
  const nextState = {
    ...playerStore.get(),
    sleepTimerEndsAt: null,
    sleepTimerEndOfTrack: true,
  };
  setAndPersistPlayerState(nextState);
};

const clearSleepTimer = () => {
  const nextState = {
    ...playerStore.get(),
    sleepTimerEndsAt: null,
    sleepTimerEndOfTrack: false,
  };
  setAndPersistPlayerState(nextState);
};

/**
 * Called from the playback progress tick. Pauses and clears the timer once
 * the deadline has passed. Safe to call on every tick — it returns
 * immediately when no timer is armed.
 */
export const checkSleepTimer = async () => {
  const state = playerStore.get();
  const endsAt = state.sleepTimerEndsAt;
  if (!endsAt || Date.now() < endsAt) return;

  try {
    await TrackPlayer.pause();
  } catch (error) {
    logger.error('Sleep timer failed to pause playback', error as Error);
  } finally {
    // Clear regardless of whether the pause succeeded, so a failure cannot
    // leave a stale deadline that pauses the next thing the user plays.
    clearSleepTimer();
  }
};

/**
 * Called when a track finishes. Only acts in "end of lecture" mode; the
 * duration mode is handled by checkSleepTimer.
 */
export const handleTrackEndedForSleepTimer = async () => {
  if (!playerStore.get().sleepTimerEndOfTrack) return;

  try {
    await TrackPlayer.pause();
  } catch (error) {
    logger.error('Sleep timer failed to pause at end of track', error as Error);
  } finally {
    clearSleepTimer();
  }
};

const setRepeatMode = (mode: 'off' | 'all' | 'one') => {
  logger.debug('🔁 PlayerStore: Set repeat mode:', mode);

  const repeatModeValue =
    mode === 'one' ? RepeatMode.Track : mode === 'all' ? RepeatMode.Queue : RepeatMode.Off;
  void ensureTrackPlayerReady()
    .then(() => TrackPlayer.setRepeatMode(repeatModeValue))
    .catch((error) => logger.error('Failed to set repeat mode', error as Error));

  const nextState = {
    ...playerStore.get(),
    repeatMode: mode,
  };
  setAndPersistPlayerState(nextState);
  persistQueueSnapshot(nextState);
};

const clearQueue = () => {
  beginPlaybackRequest();
  logger.debug('🗑️ PlayerStore: Clearing queue');

  setAndPersistPlayerState({
    ...playerStore.get(),
    queue: [],
    currentQueueIndex: -1,
    currentEpisode: null,
    isShuffled: false,
  });
  void ensureTrackPlayerReady()
    .then(() => TrackPlayer.reset())
    .catch((error) => logger.error('Failed to clear track player queue', error as Error));
  void clearQueueSnapshot();
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
  setSleepTimer,
  setSleepTimerEndOfTrack,
  clearSleepTimer,
  checkSleepTimer,
  handleTrackEndedForSleepTimer,
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
