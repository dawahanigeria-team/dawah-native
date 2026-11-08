/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using Track Player
 * Syncs audio status with the playerStore
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { useAudioPlayback } from '../../hooks/useAudioPlayback'
import { lectureDetailApi } from '../../services/api/lectureDetail.api'
import { addSentryBreadcrumb, captureSentryException } from '../../services/config/sentry.config'
import { downloadsService } from '../../services/downloads.service'
import { reportPlaybackError, type PlaybackErrorEvent } from '../../services/playbackErrorReport'
import { analytics } from '../../services/analytics.service'
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  releasePlayer,
  useTrackPlayerEvents,
} from '../../services/expoTrackPlayerCompat'
import {
  loadQueueSnapshot,
  saveQueueSnapshot,
  toQueueEpisodeSnapshot,
} from '../../services/playerQueue.service'
import { buildPlaylistKey, buildQueue } from '../../services/trackPlayerQueue.service'
import { ensureTrackPlayerReady } from '../../services/trackPlayerReady.service'
import {
  checkSleepTimer,
  getPlaybackRequestId,
  handleTrackEndedForSleepTimer,
  playerStore,
  resolveEpisodeArtistName,
  setAudioControls,
} from '../../stores/playerStore'
import type { Episode, PlayerState } from '../../types/types'
import { shouldWriteProgress } from '../../utils/progressThrottle'
import { historyService } from '../../services/history.service'

interface AudioProviderProps {
  children: React.ReactNode
}

const STARTUP_AUDIO_SETUP_DELAY_MS = 2000

const resolvePlaybackUri = (episode: Episode): string => {
  return downloadsService.getPlaybackUri(episode.id, episode.audioUrl)
}


const detailToEpisode = (detail: {
  id: string
  title: string
  audioUrl: string
  coverUrl: string
  durationSec: number
  views: number
  downloads: number
  language?: string
  lecturerName?: string
  postedDate?: string
  updatedDate?: string
  albumId?: string
  isReciter?: boolean
  reciter?: { name?: string; isReciter?: boolean }
}): Episode => ({
  id: detail.id,
  title: detail.title,
  durationSec: detail.durationSec ?? 0,
  coverUrl: detail.coverUrl ?? '',
  audioUrl: detail.audioUrl ?? '',
  seriesId: detail.albumId ?? '',
  plays: detail.views ?? 0,
  liked: false,
  language: detail.language ?? 'Unknown',
  downloads: detail.downloads ?? 0,
  createdAt: detail.postedDate ?? detail.updatedDate ?? new Date().toISOString(),
  lecturerName: detail.lecturerName ?? detail.reciter?.name,
  rpname: (detail as any).raw?.rpname,
  reciter_name: (detail as any).raw?.reciter_name ?? detail.reciter?.name,
  isReciter: detail.isReciter ?? (detail as any).raw?.is_reciter ?? detail.reciter?.isReciter ?? false,
} as Episode)

const downloadMetadataToEpisode = (metadata: {
  lectureId: string
  title: string
  lecturerName: string
  coverUrl?: string
  audioUrl?: string
  duration: number
  downloadedAt: string
}): Episode => ({
  id: metadata.lectureId,
  title: metadata.title,
  durationSec: metadata.duration ?? 0,
  coverUrl: metadata.coverUrl ?? '',
  audioUrl: metadata.audioUrl ?? '',
  seriesId: '',
  plays: 0,
  liked: false,
  language: 'Unknown',
  downloads: 0,
  createdAt: metadata.downloadedAt ?? new Date().toISOString(),
  lecturerName: metadata.lecturerName,
})

const buildQueueSnapshotFromState = (state: PlayerState) => {
  if (!state.queue.length || state.currentQueueIndex < 0) {
    return null
  }

  const currentEpisode = state.currentEpisode ?? state.queue[state.currentQueueIndex]

  return {
    trackIds: state.queue.map((episode) => String(episode.id)),
    originalTrackIds: state.originalQueue.length > 0
      ? state.originalQueue.map((episode) => String(episode.id))
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
  }
}

const persistQueueSnapshot = (state: PlayerState) => {
  const snapshot = buildQueueSnapshotFromState(state)
  if (!snapshot) return
  void saveQueueSnapshot(snapshot)
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const isInitializedRef = useRef(false)
  const hasRestoredRef = useRef(false)
  const isRestoringRef = useRef(false)
  const lastSnapshotAtRef = useRef(0)
  const lastProgressWriteRef = useRef<{ at: number; episodeId: string | null }>({
    at: 0,
    episodeId: null,
  })
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const audioControlsRef = useRef<ReturnType<typeof useAudioPlayback> | null>(null)
  const playbackErrorEvents = useMemo(() => [Event.PlaybackError], [])
  const activeTrackEvents = useMemo(() => [Event.PlaybackActiveTrackChanged], [])
  // The sleep timer is checked from the progress tick rather than a
  // setTimeout: it needs to fire while the app is backgrounded and the screen
  // is off, which is exactly when JS timers get throttled. This event keeps
  // firing for as long as audio is playing.
  const progressEvents = useMemo(() => [Event.PlaybackProgressUpdated], [])

  useEffect(() => {
    let setupTimeout: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    // Capture this before deferring. A playback choice made during startup
    // must always win over restoration of the previous session.
    const restoreRequestId = getPlaybackRequestId()

    const setupTrackPlayer = async () => {
      try {
        await ensureTrackPlayerReady()

        if (cancelled) return

        await TrackPlayer.updateOptions({
          forwardJumpInterval: 15,
          backwardJumpInterval: 15,
        })

        addSentryBreadcrumb('Track Player configured', 'info', {
          platform: Platform.OS,
          interruptionsHandled: true,
        })

        if (!hasRestoredRef.current && !isRestoringRef.current) {
          isRestoringRef.current = true
          const restorationWasSuperseded = () => restoreRequestId !== getPlaybackRequestId()
          const stopSupersededRestoration = () => {
            if (!cancelled && !restorationWasSuperseded()) return false
            hasRestoredRef.current = true
            addSentryBreadcrumb('Skipped stale queue restoration after a newer playback choice', 'playback')
            return true
          }
          try {
            const snapshot = await loadQueueSnapshot()
            if (stopSupersededRestoration()) return
            if (!snapshot || snapshot.trackIds.length === 0) {
              hasRestoredRef.current = true
              return
            }

            const episodes: Episode[] = []
            const persistedEpisodesById = new Map(
              (snapshot.episodes ?? []).map((episode) => [String(episode.id), episode as Episode]),
            )
            for (const id of snapshot.trackIds) {
              const persistedEpisode = persistedEpisodesById.get(String(id))
              if (persistedEpisode?.audioUrl) {
                episodes.push(persistedEpisode)
                continue
              }

              const downloaded = downloadsService.getDownloadMetadata(id)
              if (downloaded) {
                episodes.push(downloadMetadataToEpisode(downloaded))
                continue
              }

              try {
                const detail = await lectureDetailApi.getLectureDetail({ lectureId: id, useCache: true, countView: false })
                if (stopSupersededRestoration()) return
                episodes.push(detailToEpisode(detail))
              } catch (error) {
                captureSentryException(error as Error, {
                  component: 'AudioProvider',
                  action: 'restoreQueue',
                  lectureId: id,
                  level: 'warning',
                })
              }
            }

            if (!episodes.length) {
              hasRestoredRef.current = true
              return
            }

            const queue = episodes
            const filteredQueue = queue.filter((episode) => resolvePlaybackUri(episode))
            if (!filteredQueue.length) {
              hasRestoredRef.current = true
              return
            }
            const tracks = buildQueue(filteredQueue, resolvePlaybackUri)
            if (!tracks.length) {
              hasRestoredRef.current = true
              return
            }

            if (stopSupersededRestoration()) return
            await TrackPlayer.reset()
            if (stopSupersededRestoration()) return
            await TrackPlayer.add(tracks, { activate: false })
            if (stopSupersededRestoration()) return
            await TrackPlayer.setPlaylistKey(buildPlaylistKey(filteredQueue))
            if (stopSupersededRestoration()) return

            const snapshotTrackId = snapshot.trackIds[snapshot.currentIndex]
            const matchedIndex = snapshotTrackId
              ? filteredQueue.findIndex((episode) => String(episode.id) === String(snapshotTrackId))
              : -1
            const safeIndex =
              matchedIndex >= 0
                ? matchedIndex
                : Math.max(0, Math.min(snapshot.currentIndex, tracks.length - 1))
            const repeatModeValue =
              snapshot.repeatMode === 'one'
                ? RepeatMode.Track
                : snapshot.repeatMode === 'all'
                  ? RepeatMode.Queue
                  : RepeatMode.Off
            await TrackPlayer.setRepeatMode(repeatModeValue)
            if (stopSupersededRestoration()) return

            if (snapshot.playbackRate) {
              await TrackPlayer.setRate(snapshot.playbackRate)
              if (stopSupersededRestoration()) return
            }

            // Keep the restored queue inactive. Loading the selected remote
            // media here would spend bandwidth and show a spinner before the
            // user has asked to resume. togglePlayPause activates and seeks it
            // on demand.

            const currentEpisode = filteredQueue[safeIndex]
            const filteredEpisodeById = new Map(
              filteredQueue.map((episode) => [String(episode.id), episode]),
            )
            const restoredOriginalQueue = snapshot.originalEpisodes?.length
              ? snapshot.originalEpisodes as Episode[]
              : (snapshot.originalTrackIds ?? [])
                .map((id) => filteredEpisodeById.get(String(id)))
                .filter((episode): episode is Episode => Boolean(episode))
            const restoredState = {
              ...playerStore.get(),
              queue: filteredQueue,
              originalQueue: restoredOriginalQueue,
              currentQueueIndex: safeIndex,
              currentEpisode,
              progress: snapshot.position ?? 0,
              duration: currentEpisode?.durationSec ?? 0,
              playbackSpeed: snapshot.playbackRate ?? 1,
              repeatMode: snapshot.repeatMode ?? 'off',
              isShuffled: snapshot.isShuffled ?? false,
              isPlaying: false,
            }
            playerStore.set(restoredState)
            // Migrate legacy ID-only snapshots after their one-time restore so
            // following launches can rebuild the queue without API requests.
            persistQueueSnapshot(restoredState)

            hasRestoredRef.current = true
          } finally {
            isRestoringRef.current = false
          }
        }
      } catch (error) {
        captureSentryException(error as Error, {
          component: 'AudioProvider',
          action: 'setupTrackPlayer',
          level: 'error',
        })
      }
    }

    const idleTask = requestIdleCallback(() => {
      setupTimeout = setTimeout(() => {
        setupTrackPlayer().catch((error) => {
          captureSentryException(error as Error, {
            component: 'AudioProvider',
            action: 'setupTrackPlayer-unhandled',
            level: 'error',
          })
        })
      }, STARTUP_AUDIO_SETUP_DELAY_MS)
    }, { timeout: 1500 })

    return () => {
      cancelled = true
      cancelIdleCallback(idleTask)
      if (setupTimeout) {
        clearTimeout(setupTimeout)
      }
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current
      appStateRef.current = nextState

      if (nextState !== 'active' || prevState === 'active') {
        return
      }

      void (async () => {
        const currentState = playerStore.get()
        if (!currentState.currentEpisode) return

        try {
          const [progress, playbackState] = await Promise.all([
            TrackPlayer.getProgress(),
            TrackPlayer.getPlaybackState(),
          ])

          const rawState =
            typeof playbackState === 'object' && playbackState !== null && 'state' in playbackState
              ? playbackState.state
              : playbackState

          const nextStateSnapshot = {
            ...currentState,
            progress:
              Number.isFinite(progress.position) && progress.position >= 0
                ? progress.position
                : currentState.progress,
            duration:
              Number.isFinite(progress.duration) && progress.duration > 0
                ? progress.duration
                : currentState.duration,
            isPlaying: rawState === State.Playing,
            isLoading: rawState === State.Buffering || rawState === State.Loading,
          }

          playerStore.set(nextStateSnapshot)
          persistQueueSnapshot(nextStateSnapshot)
          void historyService.recordPosition(currentState.currentEpisode, nextStateSnapshot.progress)
        } catch (error) {
          captureSentryException(error as Error, {
            component: 'AudioProvider',
            action: 'foregroundResync',
            level: 'warning',
          })
        }
      })()
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const audioControls = useAudioPlayback({
    onPlaybackStatusUpdate: (status) => {
      // Ahead of the foreground check: most long lectures are heard with the screen off.
      const playingEpisode = playerStore.get().currentEpisode
      if (playingEpisode && status.isPlaying) {
        void historyService.recordPosition(playingEpisode, status.currentTime)
      }

      if (appStateRef.current !== 'active') {
        return
      }

      const currentState = playerStore.get()

      if (!currentState.currentEpisode) return

      const updates: Partial<typeof currentState> = {}

      if (status.isPlaying !== currentState.isPlaying) {
        updates.isPlaying = status.isPlaying
      }

      const shouldUpdateProgress =
        status.isPlaying ||
        status.currentTime < currentState.progress ||
        status.currentTime === 0
      const nowMs = Date.now()
      const episodeId = String(currentState.currentEpisode.id)
      if (
        shouldUpdateProgress &&
        status.currentTime !== currentState.progress &&
        shouldWriteProgress({
          currentTime: status.currentTime,
          storedProgress: currentState.progress,
          nowMs,
          lastWriteMs: lastProgressWriteRef.current.at,
          episodeId,
          lastWriteEpisodeId: lastProgressWriteRef.current.episodeId,
        })
      ) {
        updates.progress = status.currentTime
        lastProgressWriteRef.current = { at: nowMs, episodeId }
      }
      if (status.duration !== currentState.duration && status.duration > 0) {
        updates.duration = status.duration

        // Keep the episode and queue metadata in sync with the duration that
        // the native player measured. This repairs records whose API duration
        // is missing/zero for every player surface during this session.
        updates.currentEpisode = {
          ...currentState.currentEpisode,
          durationSec: status.duration,
        }
        updates.queue = currentState.queue.map((episode) =>
          String(episode.id) === String(currentState.currentEpisode?.id)
            ? { ...episode, durationSec: status.duration }
            : episode
        )
        updates.originalQueue = currentState.originalQueue.map((episode) =>
          String(episode.id) === String(currentState.currentEpisode?.id)
            ? { ...episode, durationSec: status.duration }
            : episode
        )
      }

      if (status.isBuffering !== currentState.isLoading) {
        updates.isLoading = status.isBuffering
      }

      if (Object.keys(updates).length > 0) {
        const nextState = {
          ...currentState,
          ...updates,
        }
        playerStore.set(nextState)

        const now = Date.now()
        if (now - lastSnapshotAtRef.current > 15000) {
          persistQueueSnapshot(nextState)
          lastSnapshotAtRef.current = now
        }
      }
    },
    onPlaybackFinished: () => {
      const currentState = playerStore.get()
      if (currentState.currentEpisode) {
        analytics.capture('lecture_completed', {
          lecture_id: String(currentState.currentEpisode.id),
          lecture_title: currentState.currentEpisode.title,
          duration_seconds: currentState.duration || currentState.currentEpisode.durationSec || null,
        })
      }
      const nextState = {
        ...currentState,
        isPlaying: false,
        progress: 0,
      }
      playerStore.set(nextState)
      persistQueueSnapshot(nextState)
    },
  })

  useEffect(() => {
    audioControlsRef.current = audioControls
  }, [audioControls])

  const handlePlaybackError = useCallback((event: PlaybackErrorEvent) => {
    void reportPlaybackError(event, playerStore.get().currentEpisode?.id)

    if (event.code === 'audio-source-error') {
      // A failed AVPlayer/ExoPlayer source cannot recover by seeking the same
      // failed item. End the spinner and let the listener retry or pick a track.
      playerStore.set({
        ...playerStore.get(),
        isPlaying: false,
        isLoading: false,
        errorMessage: 'This audio could not be loaded. Please try again.',
      })
      return
    }

    void (async () => {
      try {
        const progress = await TrackPlayer.getProgress()
        if (Number.isFinite(progress.position)) {
          await TrackPlayer.seekTo(Math.max(0, progress.position - 1))
        }
        await TrackPlayer.play()
        return
      } catch (retryError) {
        addSentryBreadcrumb('PlaybackError recovery: seek-back retry failed', 'error', {
          error: (retryError as Error).message,
        })
      }

      try {
        await TrackPlayer.skipToNext()
        await TrackPlayer.play()
        return
      } catch (skipError) {
        addSentryBreadcrumb('PlaybackError recovery: skip-to-next failed', 'error', {
          error: (skipError as Error).message,
        })
      }

      try {
        await TrackPlayer.stop()
      } catch (stopError) {
        addSentryBreadcrumb('PlaybackError recovery: stop failed', 'error', {
          error: (stopError as Error).message,
        })
      }

      playerStore.set({
        ...playerStore.get(),
        isPlaying: false,
        isLoading: false,
      })
    })()
  }, [])

  useTrackPlayerEvents(playbackErrorEvents, handlePlaybackError)

  const handlePlaybackActiveTrackChanged = useCallback((event: {
    index?: number
    track?: { id?: string | number }
  }) => {
    // "Stop at the end of this lecture" resolves here, because a track change
    // is the signal that the lecture the user armed the timer on has finished.
    // A manual skip also counts as finishing it, which matches the intent —
    // they are done with that lecture either way.
    void handleTrackEndedForSleepTimer()

    const currentState = playerStore.get()
    if (!currentState.queue.length) return

    const queueIndex =
      typeof event.index === 'number'
        ? event.index
        : event.track?.id
          ? currentState.queue.findIndex((item) => String(item.id) === String(event.track?.id))
          : -1

    if (queueIndex < 0 || !currentState.queue[queueIndex]) return

    const nextEpisode = currentState.queue[queueIndex]
    const nextState = {
      ...currentState,
      currentQueueIndex: queueIndex,
      currentEpisode: nextEpisode,
      duration: nextEpisode.durationSec,
      progress: 0,
    }
    playerStore.set(nextState)
    persistQueueSnapshot(nextState)

    audioControlsRef.current?.setLockScreenInfo({
      title: nextEpisode.title,
      artist: resolveEpisodeArtistName(nextEpisode),
      artwork: nextEpisode.coverUrl || '',
    })
  }, [])

  useTrackPlayerEvents(activeTrackEvents, handlePlaybackActiveTrackChanged)

  const handleProgressForSleepTimer = useCallback(() => {
    void checkSleepTimer()
  }, [])

  useTrackPlayerEvents(progressEvents, handleProgressForSleepTimer)

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
    }

    setAudioControls(audioControls)
  }, [audioControls])

  useEffect(() => {
    return () => {
      setAudioControls(null)
      isInitializedRef.current = false
      releasePlayer()
    }
  }, [])

  return <>{children}</>
}
