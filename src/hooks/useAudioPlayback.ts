/**
 * Audio Playback Hook
 * Custom hook that wraps Track Player for centralized audio playback management
 */

import TrackPlayer, {
  Event,
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player'
import type { PlaybackState, Progress } from 'react-native-track-player'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureTrackPlayerReady } from '../services/trackPlayerReady.service'

const HTTP_URL_REGEX = /^https?:\/\//i

/**
 * Native players reject certain reserved characters (e.g. [] or '),
 * so ensure remote URLs are percent-encoded before loading.
 */
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

export interface AudioPlaybackConfig {
  onPlaybackStatusUpdate?: (status: AudioPlaybackStatus) => void
  onPlaybackFinished?: () => void
}

export interface AudioPlaybackStatus {
  isLoaded: boolean
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  playbackRate: number
  didJustFinish?: boolean
}

export interface AudioPlaybackControls {
  loadAudio: (uri: string) => Promise<void>
  play: () => void
  pause: () => void
  togglePlayPause: () => void
  seekTo: (seconds: number) => void
  seekForward: (seconds?: number) => void
  seekBackward: (seconds?: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
  stop: () => void
  unload: () => void
  setLockScreenInfo: (info: { title: string; artist?: string; artwork?: string }) => void
  status: AudioPlaybackStatus
  isReady: boolean
  player: typeof TrackPlayer
}

export const buildPlaybackStatus = ({
  playbackState,
  progress,
  volume,
  rate,
  isLoaded,
}: {
  playbackState: PlaybackState | { state: undefined }
  progress: Progress
  volume: number
  rate: number
  isLoaded: boolean
}): AudioPlaybackStatus => {
  const state = playbackState.state
  const isPlaying = state === State.Playing
  const isBuffering = state === State.Buffering || state === State.Loading
  const isPaused =
    (state === State.Paused || state === State.Ready) && progress.position > 0

  return {
    isLoaded,
    isPlaying,
    isPaused,
    isBuffering,
    currentTime: progress.position,
    duration: progress.duration,
    volume,
    muted: volume === 0,
    playbackRate: rate,
    didJustFinish: false,
  }
}

/**
 * Custom hook for audio playback using Track Player
 */
export function useAudioPlayback(config?: AudioPlaybackConfig): AudioPlaybackControls {
  const [isReady, setIsReady] = useState(false)
  const volumeRef = useRef(1)
  const rateRef = useRef(1)

  const playbackState = usePlaybackState()
  const progress = useProgress(500)
  const activeTrack = useActiveTrack()

  const status = useMemo(
    () =>
      buildPlaybackStatus({
        playbackState,
        progress,
        volume: volumeRef.current,
        rate: rateRef.current,
        isLoaded: Boolean(activeTrack),
      }),
    [playbackState, progress, activeTrack]
  )

  useTrackPlayerEvents([Event.PlaybackQueueEnded], () => {
    config?.onPlaybackFinished?.()
  })

  useEffect(() => {
    if (config?.onPlaybackStatusUpdate) {
      config.onPlaybackStatusUpdate(status)
    }
  }, [config, status])

  const loadAudio = async (uri: string): Promise<void> => {
    const normalizedUri = sanitizeAudioUri(uri)
    setIsReady(false)

    await ensureTrackPlayerReady()
    await TrackPlayer.reset()
    await TrackPlayer.add({
      id: normalizedUri,
      url: normalizedUri,
      title: 'Audio',
    })

    setIsReady(true)
  }

  const play = () => {
    if (!status.isLoaded) {
      return
    }

    void TrackPlayer.play()
  }

  const pause = () => {
    if (!status.isLoaded) {
      return
    }

    void TrackPlayer.pause()
  }

  const togglePlayPause = () => {
    if (status.isPlaying) {
      pause()
      return
    }

    play()
  }

  const seekTo = (seconds: number) => {
    if (!status.isLoaded) {
      return
    }

    const clampedSeconds = Math.max(0, Math.min(seconds, status.duration))
    void TrackPlayer.seekTo(clampedSeconds)
  }

  const seekForward = (seconds: number = 15) => {
    const newPosition = Math.min(status.currentTime + seconds, status.duration)
    seekTo(newPosition)
  }

  const seekBackward = (seconds: number = 15) => {
    const newPosition = Math.max(status.currentTime - seconds, 0)
    seekTo(newPosition)
  }

  const setPlaybackRate = (rate: number) => {
    rateRef.current = rate
    void TrackPlayer.setRate(rate)
  }

  const setVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(volume, 1))
    volumeRef.current = clampedVolume
    void TrackPlayer.setVolume(clampedVolume)
  }

  const stop = () => {
    if (!status.isLoaded) {
      return
    }

    void TrackPlayer.stop()
  }

  const unload = () => {
    setIsReady(false)
    void TrackPlayer.reset()
  }

  const setLockScreenInfo = (info: { title: string; artist?: string; artwork?: string }) => {
    if (!status.isLoaded) {
      return
    }

    void (async () => {
      const currentTrack = await TrackPlayer.getCurrentTrack()
      if (currentTrack === null) {
        return
      }

      await TrackPlayer.updateMetadataForTrack(currentTrack, {
        title: info.title,
        artist: info.artist || '',
        artwork: info.artwork || '',
      })
    })()
  }

  return {
    loadAudio,
    play,
    pause,
    togglePlayPause,
    seekTo,
    seekForward,
    seekBackward,
    setPlaybackRate,
    setVolume,
    stop,
    unload,
    setLockScreenInfo,
    status,
    isReady,
    player: TrackPlayer,
  }
}
