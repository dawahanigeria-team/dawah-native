import type { AudioLockScreenOptions, AudioPlayer, AudioStatus } from 'expo-audio'
import { AudioModule, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { logger } from '../utils/logger'

export const State = {
  None: 'none',
  Ready: 'ready',
  Playing: 'playing',
  Paused: 'paused',
  Stopped: 'stopped',
  Loading: 'loading',
  Buffering: 'buffering',
  Error: 'error',
  Ended: 'ended',
} as const

export const Event = {
  PlaybackState: 'playback-state',
  PlaybackError: 'playback-error',
  PlaybackQueueEnded: 'playback-queue-ended',
  PlaybackActiveTrackChanged: 'playback-active-track-changed',
  PlaybackProgressUpdated: 'playback-progress-updated',
  RemotePlay: 'remote-play',
  RemotePause: 'remote-pause',
  RemoteNext: 'remote-next',
  RemotePrevious: 'remote-previous',
  RemoteSeek: 'remote-seek',
  RemoteJumpForward: 'remote-jump-forward',
  RemoteJumpBackward: 'remote-jump-backward',
  RemoteStop: 'remote-stop',
  RemoteDuck: 'remote-duck',
} as const

export const RepeatMode = {
  Off: 0,
  Track: 1,
  Queue: 2,
} as const

export const Capability = {
  Play: 'play',
  Pause: 'pause',
  Stop: 'stop',
  SeekTo: 'seekTo',
  SkipToNext: 'skipToNext',
  SkipToPrevious: 'skipToPrevious',
  JumpForward: 'jumpForward',
  JumpBackward: 'jumpBackward',
} as const

export const AppKilledPlaybackBehavior = {
  ContinuePlayback: 'continue-playback',
  PausePlayback: 'pause-playback',
  StopPlaybackAndRemoveNotification: 'stop-playback-remove-notification',
} as const

export const AndroidAudioContentType = {
  Music: 'music',
} as const

export const IOSCategory = {
  Playback: 'playback',
} as const

export const IOSCategoryMode = {
  Default: 'default',
} as const

export const IOSCategoryOptions = {
  AllowBluetooth: 'allowBluetooth',
  AllowAirPlay: 'allowAirPlay',
} as const

export type SetupPlayerOptions = Record<string, unknown>

export type PlaybackState = {
  state: (typeof State)[keyof typeof State]
}

export type Progress = {
  position: number
  duration: number
  buffered: number
}

type Listener = (payload: any) => void

type Track = {
  id: string
  url: string
  title: string
  artist?: string
  artwork?: string
  duration?: number
}

type ActiveTrackChangedEvent = {
  index: number
  track?: Track
}

type AddEventListenerReturn = {
  remove: () => void
}

type AddOptions = {
  activate?: boolean
}

type ResetOptions = {
  release?: boolean
}

const HTTP_URL_REGEX = /^https?:\/\//i

const sanitizeAudioUri = (uri: string): string => {
  if (!uri || !HTTP_URL_REGEX.test(uri)) {
    return uri
  }

  const encode = (value: string) => encodeURI(value).replace(/'/g, '%27')

  try {
    return encode(decodeURI(uri))
  } catch {
    return encode(uri)
  }
}

const listeners = new Map<string, Set<Listener>>()

let player: AudioPlayer | null = null
let _playerStatusSubscription: AddEventListenerReturn | null = null

let queue: Track[] = []
let activeTrackIndex = -1
let repeatMode: number = RepeatMode.Off
let state: PlaybackState['state'] = State.None
let progress: Progress = { position: 0, duration: 0, buffered: 0 }

let lockScreenOptions: AudioLockScreenOptions | undefined
let jumpForwardInterval = 15
let jumpBackwardInterval = 15
let playlistKey: string | null = null
let isLockScreenActive = false
let shouldResumeWhenLoaded = false

const emit = (event: string, payload: unknown) => {
  const eventListeners = listeners.get(event)
  if (!eventListeners?.size) return
  eventListeners.forEach((listener) => {
    listener(payload)
  })
}

const setPlaybackState = (nextState: PlaybackState['state']) => {
  if (state === nextState) return
  state = nextState
  emit(Event.PlaybackState, { state })
}

const setProgress = (nextProgress: Progress) => {
  progress = nextProgress
  emit(Event.PlaybackProgressUpdated, nextProgress)
}

const mapAudioStatusToState = (audioStatus: AudioStatus): PlaybackState['state'] => {
  if (audioStatus.isBuffering) {
    return State.Buffering
  }
  if (audioStatus.playing) {
    return State.Playing
  }
  if (!audioStatus.isLoaded) {
    return State.Loading
  }
  if (audioStatus.didJustFinish) {
    return State.Ended
  }
  return State.Paused
}

const metadataForTrack = (track: Track | undefined) => {
  if (!track) return undefined
  return {
    title: track.title,
    // Android MediaSession may fallback to app/source metadata when artist is empty.
    // Non-breaking space avoids auto-fallback while remaining visually blank when needed.
    artist: track.artist || '\u00A0',
    artworkUrl: track.artwork,
  }
}

const getActiveTrack = (): Track | undefined => {
  if (activeTrackIndex < 0 || activeTrackIndex >= queue.length) return undefined
  return queue[activeTrackIndex]
}

const buildDefaultPlaylistKey = (tracks: Track[]): string | null => {
  if (!tracks.length) return null
  return tracks.map((track) => track.id).join('|')
}

const isLegacyAudioPlayerConstructorError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return /\breceived 4 arguments, but 3 was expected\b/i.test(message)
}

const createCompatAudioPlayer = (): AudioPlayer => {
  try {
    return createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true })
  } catch (error) {
    if (!isLegacyAudioPlayerConstructorError(error)) {
      throw error
    }

    logger.warn('expo-audio native module expects legacy AudioPlayer constructor, falling back', {
      error: error instanceof Error ? error.message : String(error),
    })

    const LegacyAudioPlayer = AudioModule.AudioPlayer as unknown as new (
      source: null,
      updateInterval: number,
      keepAudioSessionActive: boolean
    ) => AudioPlayer

    return new LegacyAudioPlayer(null, 250, true)
  }
}

const ensurePlayer = (): AudioPlayer => {
  if (player) return player

  player = createCompatAudioPlayer()
  _playerStatusSubscription = player.addListener('playbackStatusUpdate', (audioStatus: AudioStatus) => {
    if (shouldResumeWhenLoaded && audioStatus.isLoaded && !audioStatus.playing) {
      try {
        player?.play()
      } catch {
        // Ignore and keep waiting for the next status update.
      }
    }
    if (audioStatus.playing || audioStatus.didJustFinish) {
      shouldResumeWhenLoaded = false
    }

    setProgress({
      position: Number.isFinite(audioStatus.currentTime) ? audioStatus.currentTime : 0,
      duration: Number.isFinite(audioStatus.duration) ? audioStatus.duration : 0,
      buffered: Number.isFinite(audioStatus.currentTime) ? audioStatus.currentTime : 0,
    })
    setPlaybackState(mapAudioStatusToState(audioStatus))

    if (!audioStatus.didJustFinish) {
      return
    }

    void handleTrackFinished().catch(() => {
      // Prevent unhandled rejection from crashing the app.
      setPlaybackState(State.Ended)
    })
  })

  return player
}

const clearLockScreenControlsSafely = (currentPlayer: AudioPlayer): void => {
  // Android 14 devices can crash with
  // ForegroundServiceDidNotStartInTimeException when clearing controls.
  // Keeping this call iOS-only avoids fatal background crashes.
  if (Platform.OS === 'android') {
    return
  }

  currentPlayer.clearLockScreenControls()
}

const setLockScreenState = (active: boolean, track?: Track) => {
  const currentPlayer = ensurePlayer()
  const canActivateOnAndroid =
    Platform.OS !== 'android' || state === State.Playing || state === State.Buffering

  if (active) {
    if (!canActivateOnAndroid) {
      return
    }
    const metadata = metadataForTrack(track)
    if (__DEV__) {
      logger.debug('[LockScreen] Activating lock screen controls', {
        hasPlayer: !!currentPlayer,
        metadata,
        options: lockScreenOptions,
      })
    }
    try {
      if (!isLockScreenActive) {
        currentPlayer.setActiveForLockScreen(true, metadata, lockScreenOptions)
        isLockScreenActive = true
      } else if (metadata) {
        currentPlayer.updateLockScreenMetadata(metadata)
      }
      if (__DEV__) {
        logger.debug('[LockScreen] setActiveForLockScreen call succeeded')
      }
    } catch (error) {
      console.warn('[LockScreen] setActiveForLockScreen FAILED:', (error as Error).message)
    }
    return
  }
  if (!isLockScreenActive) {
    return
  }
  try {
    clearLockScreenControlsSafely(currentPlayer)
  } catch (error) {
    console.warn('[LockScreen] clearLockScreenControls FAILED:', (error as Error).message)
  }
  isLockScreenActive = false
}

const activateTrack = async (index: number, autoPlay: boolean): Promise<void> => {
  if (index < 0 || index >= queue.length) {
    const error = new Error(`Track index ${index} is out of bounds`)
    setPlaybackState(State.Error)
    emit(Event.PlaybackError, { code: 'index-out-of-bounds', message: error.message })
    throw error
  }

  const currentPlayer = ensurePlayer()
  const track = queue[index]
  const source = sanitizeAudioUri(typeof track.url === 'string' ? track.url.trim() : '')
  if (!source) {
    const error = new Error(`Track ${track.id} has no playable URL`)
    setPlaybackState(State.Error)
    emit(Event.PlaybackError, { code: 'missing-track-url', message: error.message })
    throw error
  }

  setPlaybackState(State.Loading)
  await currentPlayer.replace(source)
  activeTrackIndex = index
  setProgress({
    position: 0,
    duration: Number.isFinite(track.duration) ? (track.duration as number) : currentPlayer.duration,
    buffered: 0,
  })
  emit(Event.PlaybackActiveTrackChanged, {
    index,
    track,
  } satisfies ActiveTrackChangedEvent)

  if (isLockScreenActive) {
    setLockScreenState(true, track)
  }

  if (autoPlay) {
    shouldResumeWhenLoaded = true
    setPlaybackState(State.Buffering)
    currentPlayer.play()
    setLockScreenState(true, track)
  }
}

const handleTrackFinished = async (): Promise<void> => {
  if (!queue.length || activeTrackIndex < 0) {
    setPlaybackState(State.Ended)
    emit(Event.PlaybackQueueEnded, {})
    return
  }

  if (repeatMode === RepeatMode.Track) {
    const currentPlayer = ensurePlayer()
    await currentPlayer.seekTo(0)
    currentPlayer.play()
    setPlaybackState(State.Playing)
    return
  }

  const hasNext = activeTrackIndex + 1 < queue.length
  if (hasNext) {
    await activateTrack(activeTrackIndex + 1, true)
    return
  }

  if (repeatMode === RepeatMode.Queue && queue.length > 0) {
    await activateTrack(0, true)
    return
  }

  setPlaybackState(State.Ended)
  emit(Event.PlaybackQueueEnded, {})
}

const addEventListener = (event: string, listener: Listener): AddEventListenerReturn => {
  const eventListeners = listeners.get(event) ?? new Set<Listener>()
  eventListeners.add(listener)
  listeners.set(event, eventListeners)

  return {
    remove: () => {
      const currentListeners = listeners.get(event)
      if (!currentListeners) return
      currentListeners.delete(listener)
    },
  }
}

const TrackPlayer = {
  async setupPlayer(_options?: SetupPlayerOptions): Promise<void> {
    ensurePlayer()
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    })
    if (!queue.length) {
      setPlaybackState(State.Ready)
    }
  },

  registerPlaybackService(_factory: () => Promise<unknown> | unknown): void {
    // Expo Audio does not require a separate background playback service registration.
  },

  async updateOptions(options: Record<string, unknown>): Promise<void> {
    jumpForwardInterval =
      typeof options.forwardJumpInterval === 'number' ? options.forwardJumpInterval : jumpForwardInterval
    jumpBackwardInterval =
      typeof options.backwardJumpInterval === 'number' ? options.backwardJumpInterval : jumpBackwardInterval
    lockScreenOptions = {
      showSeekForward: Boolean(options.forwardJumpInterval),
      showSeekBackward: Boolean(options.backwardJumpInterval),
    }
  },

  addEventListener,

  async reset(options?: ResetOptions): Promise<void> {
    const shouldRelease = options?.release === true

    // Capture local refs before any await to prevent race conditions
    // with concurrent releasePlayer() calls nulling out the globals.
    const currentPlayer = player
    const currentSubscription = _playerStatusSubscription

    if (currentPlayer) {
      currentPlayer.pause()
      try {
        await currentPlayer.seekTo(0)
      } catch {
        // Ignore seek failures when no media is loaded.
      }
      try {
        clearLockScreenControlsSafely(currentPlayer)
      } catch {
        // Ignore lock screen cleanup failures to keep reset state consistent.
      }
      isLockScreenActive = false
      shouldResumeWhenLoaded = false

      if (shouldRelease) {
        // Release native resources only when explicitly requested (e.g. provider unmount).
        // Normal queue resets keep the player warm for faster next-track startup.
        if (currentSubscription) {
          currentSubscription.remove()
        }
        _playerStatusSubscription = null
        currentPlayer.remove()
        player = null
      }
    }

    queue = []
    activeTrackIndex = -1
    playlistKey = null
    isLockScreenActive = false
    setProgress({ position: 0, duration: 0, buffered: 0 })
    setPlaybackState(State.None)
  },

  async add(tracks: Track | Track[], options?: AddOptions): Promise<void> {
    const normalizedTracks = Array.isArray(tracks) ? tracks : [tracks]
    if (!normalizedTracks.length) return
    const validTracks = normalizedTracks.filter((track) => {
      const source = typeof track.url === 'string' ? track.url.trim() : ''
      return source.length > 0
    })
    if (!validTracks.length) {
      throw new Error('No playable tracks to add')
    }
    queue.push(...validTracks)
    if (!playlistKey) {
      playlistKey = buildDefaultPlaylistKey(queue)
    }

    if (options?.activate !== false && activeTrackIndex === -1) {
      await activateTrack(0, false)
    }
  },

  async skip(index: number): Promise<void> {
    const shouldAutoPlay =
      state === State.Playing || state === State.Buffering || state === State.Loading
    await activateTrack(index, shouldAutoPlay)
  },

  async play(): Promise<void> {
    if (!queue.length) return
    if (activeTrackIndex < 0) {
      await activateTrack(0, false)
    }
    const currentPlayer = ensurePlayer()
    shouldResumeWhenLoaded = true
    setPlaybackState(State.Buffering)
    currentPlayer.play()
    setLockScreenState(true, getActiveTrack())
  },

  async pause(): Promise<void> {
    const currentPlayer = ensurePlayer()
    shouldResumeWhenLoaded = false
    currentPlayer.pause()
    setPlaybackState(State.Paused)
    setLockScreenState(false)
  },

  async stop(): Promise<void> {
    const currentPlayer = ensurePlayer()
    shouldResumeWhenLoaded = false
    currentPlayer.pause()
    await currentPlayer.seekTo(0)
    setProgress({
      ...progress,
      position: 0,
    })
    setPlaybackState(State.Stopped)
    setLockScreenState(false)
  },

  async seekTo(positionSeconds: number): Promise<void> {
    const currentPlayer = ensurePlayer()
    const safePosition = Math.max(0, positionSeconds)
    await currentPlayer.seekTo(safePosition)
    setProgress({
      ...progress,
      position: safePosition,
    })
  },

  async setRate(rate: number): Promise<void> {
    const currentPlayer = ensurePlayer()
    currentPlayer.setPlaybackRate(rate)
  },

  async setVolume(volume: number): Promise<void> {
    const currentPlayer = ensurePlayer()
    currentPlayer.volume = Math.max(0, Math.min(1, volume))
  },

  async getPosition(): Promise<number> {
    const currentPlayer = ensurePlayer()
    return Number.isFinite(currentPlayer.currentTime) ? currentPlayer.currentTime : progress.position
  },

  async getProgress(): Promise<Progress> {
    const currentPlayer = ensurePlayer()
    return {
      position: Number.isFinite(currentPlayer.currentTime) ? currentPlayer.currentTime : progress.position,
      duration: Number.isFinite(currentPlayer.duration) ? currentPlayer.duration : progress.duration,
      buffered: progress.buffered,
    }
  },

  async getPlaybackState(): Promise<PlaybackState> {
    return { state }
  },

  async getActiveTrackIndex(): Promise<number | null> {
    return activeTrackIndex >= 0 ? activeTrackIndex : null
  },

  async getActiveTrack(): Promise<Track | null> {
    return getActiveTrack() ?? null
  },

  async skipToNext(): Promise<void> {
    if (!queue.length) {
      throw new Error('Queue is empty')
    }
    const shouldAutoPlay =
      state === State.Playing || state === State.Buffering || state === State.Loading
    if (activeTrackIndex + 1 < queue.length) {
      await activateTrack(activeTrackIndex + 1, shouldAutoPlay)
      return
    }
    if (repeatMode === RepeatMode.Queue) {
      await activateTrack(0, shouldAutoPlay)
      return
    }
    throw new Error('No next track')
  },

  async skipToPrevious(): Promise<void> {
    if (!queue.length) {
      throw new Error('Queue is empty')
    }
    const shouldAutoPlay =
      state === State.Playing || state === State.Buffering || state === State.Loading
    if (activeTrackIndex > 0) {
      await activateTrack(activeTrackIndex - 1, shouldAutoPlay)
      return
    }
    if (repeatMode === RepeatMode.Queue) {
      await activateTrack(queue.length - 1, shouldAutoPlay)
      return
    }
    throw new Error('No previous track')
  },

  async setRepeatMode(mode: number): Promise<void> {
    repeatMode = mode
  },

  async remove(index: number): Promise<void> {
    if (index < 0 || index >= queue.length) return
    const wasPlaying = state === State.Playing
    queue.splice(index, 1)
    playlistKey = buildDefaultPlaylistKey(queue)

    if (!queue.length) {
      await TrackPlayer.reset()
      return
    }

    if (index < activeTrackIndex) {
      activeTrackIndex -= 1
      return
    }

    if (index === activeTrackIndex) {
      const nextIndex = Math.min(index, queue.length - 1)
      await activateTrack(nextIndex, false)
      if (wasPlaying) {
        await TrackPlayer.play()
      }
    }
  },

  async updateMetadataForTrack(index: number, metadata: Partial<Track>): Promise<void> {
    if (index < 0 || index >= queue.length) return
    queue[index] = {
      ...queue[index],
      ...metadata,
    }

    if (index === activeTrackIndex && isLockScreenActive) {
      setLockScreenState(true, queue[index])
    }
  },

  async updateNowPlayingMetadata(metadata: { title?: string; artist?: string; artwork?: string }): Promise<void> {
    if (activeTrackIndex < 0 || activeTrackIndex >= queue.length) return

    queue[activeTrackIndex] = {
      ...queue[activeTrackIndex],
      ...(metadata.title ? { title: metadata.title } : {}),
      ...(metadata.artist !== undefined ? { artist: metadata.artist } : {}),
      ...(metadata.artwork !== undefined ? { artwork: metadata.artwork } : {}),
    }

    if (isLockScreenActive) {
      setLockScreenState(true, queue[activeTrackIndex])
    }
  },

  async setPlaylistKey(key: string | null): Promise<void> {
    const normalizedKey = typeof key === 'string' ? key.trim() : ''
    playlistKey = normalizedKey.length > 0 ? normalizedKey : null
  },

  async getPlaylistKey(): Promise<string | null> {
    return playlistKey
  },
}

/**
 * Fully release the native audio player and reset all internal state.
 * Call this when the audio system is being torn down (e.g. AudioProvider unmount)
 * to ensure MediaCodec resources are freed on Android.
 */
export const releasePlayer = () => {
  if (_playerStatusSubscription) {
    _playerStatusSubscription.remove()
    _playerStatusSubscription = null
  }
  if (player) {
    try { player.pause() } catch { /* ignore */ }
    try { clearLockScreenControlsSafely(player) } catch { /* ignore */ }
    isLockScreenActive = false
    player.remove()
    player = null
  }
  queue = []
  activeTrackIndex = -1
  playlistKey = null
  isLockScreenActive = false
  shouldResumeWhenLoaded = false
  state = State.None
  progress = { position: 0, duration: 0, buffered: 0 }
}

export const usePlaybackState = (): PlaybackState => {
  const [currentState, setCurrentState] = useState<PlaybackState>({ state })

  useEffect(() => {
    const subscription = addEventListener(Event.PlaybackState, (payload) => {
      setCurrentState(payload as PlaybackState)
    })
    return () => {
      subscription.remove()
    }
  }, [])

  return currentState
}

export const useProgress = (intervalMs: number = 500): Progress => {
  const [currentProgress, setCurrentProgress] = useState<Progress>(progress)

  useEffect(() => {
    const subscription = addEventListener(Event.PlaybackProgressUpdated, (payload) => {
      setCurrentProgress(payload as Progress)
    })
    const interval = setInterval(() => {
      void TrackPlayer.getProgress().then((nextProgress) => {
        setCurrentProgress(nextProgress)
      }).catch(() => {
        // Ignore progress polling failures.
      })
    }, intervalMs)

    return () => {
      subscription.remove()
      clearInterval(interval)
    }
  }, [intervalMs])

  return currentProgress
}

export const useActiveTrack = (): Track | undefined => {
  const [currentTrack, setCurrentTrack] = useState<Track | undefined>(getActiveTrack())

  useEffect(() => {
    const subscription = addEventListener(Event.PlaybackActiveTrackChanged, (payload) => {
      const event = payload as ActiveTrackChangedEvent
      setCurrentTrack(event.track)
    })
    return () => {
      subscription.remove()
    }
  }, [])

  return useMemo(() => currentTrack, [currentTrack])
}

export const useTrackPlayerEvents = (
  events: Array<string>,
  listener: (payload: any) => void
): void => {
  useEffect(() => {
    const subscriptions = events.map((event) => addEventListener(event, listener))
    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
    }
  }, [events, listener])
}

export default TrackPlayer
