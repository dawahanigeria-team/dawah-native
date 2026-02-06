import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import type { AudioLockScreenOptions } from 'expo-audio'
import type { AudioPlayer, AudioStatus } from 'expo-audio'
import { useEffect, useMemo, useState } from 'react'

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

type LockScreenMetadata = {
  title?: string
  artist?: string
  artwork?: string
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
    artist: track.artist,
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

const ensurePlayer = (): AudioPlayer => {
  if (player) return player

  player = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true })
  _playerStatusSubscription = player.addListener('playbackStatusUpdate', (audioStatus: AudioStatus) => {
    setProgress({
      position: Number.isFinite(audioStatus.currentTime) ? audioStatus.currentTime : 0,
      duration: Number.isFinite(audioStatus.duration) ? audioStatus.duration : 0,
      buffered: Number.isFinite(audioStatus.currentTime) ? audioStatus.currentTime : 0,
    })
    setPlaybackState(mapAudioStatusToState(audioStatus))

    if (!audioStatus.didJustFinish) {
      return
    }

    void handleTrackFinished()
  })

  return player
}

const setLockScreenState = (active: boolean, track?: Track) => {
  const currentPlayer = ensurePlayer()
  const metadata = metadataForTrack(track)
  if (active) {
    currentPlayer.setActiveForLockScreen(true, metadata, lockScreenOptions)
    return
  }
  currentPlayer.clearLockScreenControls()
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

  currentPlayer.replace(track.url)
  activeTrackIndex = index
  setProgress({
    position: 0,
    duration: Number.isFinite(track.duration) ? (track.duration as number) : currentPlayer.duration,
    buffered: 0,
  })
  setPlaybackState(State.Ready)
  emit(Event.PlaybackActiveTrackChanged, {
    index,
    track,
  } satisfies ActiveTrackChangedEvent)

  if (autoPlay) {
    currentPlayer.play()
    setPlaybackState(State.Playing)
  }

  setLockScreenState(true, track)
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

  async reset(): Promise<void> {
    const currentPlayer = ensurePlayer()
    currentPlayer.pause()
    try {
      await currentPlayer.seekTo(0)
    } catch {
      // Ignore seek failures when no media is loaded.
    }
    currentPlayer.clearLockScreenControls()
    // Keep the same player instance to avoid re-initialization cost on every track change.
    // We only clear queue/index state and let the next activation call replace the source.
    queue = []
    activeTrackIndex = -1
    playlistKey = null
    setProgress({ position: 0, duration: 0, buffered: 0 })
    setPlaybackState(State.None)
  },

  async add(tracks: Track | Track[], options?: AddOptions): Promise<void> {
    const normalizedTracks = Array.isArray(tracks) ? tracks : [tracks]
    if (!normalizedTracks.length) return
    queue.push(...normalizedTracks)
    if (!playlistKey) {
      playlistKey = buildDefaultPlaylistKey(queue)
    }

    if (options?.activate !== false && activeTrackIndex === -1) {
      await activateTrack(0, false)
    }
  },

  async skip(index: number): Promise<void> {
    await activateTrack(index, false)
  },

  async play(): Promise<void> {
    if (!queue.length) return
    if (activeTrackIndex < 0) {
      await activateTrack(0, false)
    }
    const currentPlayer = ensurePlayer()
    currentPlayer.play()
    setPlaybackState(State.Playing)
  },

  async pause(): Promise<void> {
    const currentPlayer = ensurePlayer()
    currentPlayer.pause()
    setPlaybackState(State.Paused)
  },

  async stop(): Promise<void> {
    const currentPlayer = ensurePlayer()
    currentPlayer.pause()
    await currentPlayer.seekTo(0)
    setProgress({
      ...progress,
      position: 0,
    })
    setPlaybackState(State.Stopped)
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
    if (activeTrackIndex + 1 < queue.length) {
      await activateTrack(activeTrackIndex + 1, false)
      return
    }
    if (repeatMode === RepeatMode.Queue) {
      await activateTrack(0, false)
      return
    }
    throw new Error('No next track')
  },

  async skipToPrevious(): Promise<void> {
    if (!queue.length) {
      throw new Error('Queue is empty')
    }
    if (activeTrackIndex > 0) {
      await activateTrack(activeTrackIndex - 1, false)
      return
    }
    if (repeatMode === RepeatMode.Queue) {
      await activateTrack(queue.length - 1, false)
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

    if (index === activeTrackIndex) {
      const currentPlayer = ensurePlayer()
      currentPlayer.updateLockScreenMetadata(metadataForTrack(queue[index]) ?? {})
      setLockScreenState(true, queue[index])
    }
  },

  async updateNowPlayingMetadata(metadata: LockScreenMetadata): Promise<void> {
    if (activeTrackIndex < 0 || activeTrackIndex >= queue.length) return

    queue[activeTrackIndex] = {
      ...queue[activeTrackIndex],
      ...(metadata.title ? { title: metadata.title } : {}),
      ...(metadata.artist !== undefined ? { artist: metadata.artist } : {}),
      ...(metadata.artwork !== undefined ? { artwork: metadata.artwork } : {}),
    }

    const currentPlayer = ensurePlayer()
    currentPlayer.updateLockScreenMetadata(metadataForTrack(queue[activeTrackIndex]) ?? {})
    setLockScreenState(true, queue[activeTrackIndex])
    emit(Event.PlaybackActiveTrackChanged, {
      index: activeTrackIndex,
      track: queue[activeTrackIndex],
    } satisfies ActiveTrackChangedEvent)
  },

  async setPlaylistKey(key: string | null): Promise<void> {
    const normalizedKey = typeof key === 'string' ? key.trim() : ''
    playlistKey = normalizedKey.length > 0 ? normalizedKey : null
  },

  async getPlaylistKey(): Promise<string | null> {
    return playlistKey
  },
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
