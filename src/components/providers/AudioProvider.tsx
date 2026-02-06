/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using Track Player
 * Syncs audio status with the playerStore
 */

import TrackPlayer, {
  AndroidAudioContentType,
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
  RepeatMode,
  useTrackPlayerEvents,
} from '../../services/expoTrackPlayerCompat'
import React, { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useAudioPlayback } from '../../hooks/useAudioPlayback'
import { lectureDetailApi } from '../../services/api/lectureDetail.api'
import { addSentryBreadcrumb, captureSentryException } from '../../services/config/sentry.config'
import { downloadsService } from '../../services/downloads.service'
import { loadQueueSnapshot, saveQueueSnapshot } from '../../services/playerQueue.service'
import {
  ensureTrackPlayerReady,
  setTrackPlayerSetupConfig,
} from '../../services/trackPlayerReady.service'
import { buildPlaylistKey, buildQueue } from '../../services/trackPlayerQueue.service'
import { playerStore, resolveEpisodeArtistName, setAudioControls } from '../../stores/playerStore'
import type { Episode, PlayerState } from '../../types/types'

interface AudioProviderProps {
  children: React.ReactNode
}

const resolvePlaybackUri = (episode: Episode): string => {
  return downloadsService.getPlaybackUri(episode.id, episode.audioUrl)
}

const TRACK_PLAYER_SETUP_CONFIG = {
  iosCategory: IOSCategory.Playback,
  iosCategoryMode: IOSCategoryMode.Default,
  iosCategoryOptions: [
    IOSCategoryOptions.AllowBluetooth,
    IOSCategoryOptions.AllowAirPlay,
  ],
  androidAudioContentType: AndroidAudioContentType.Music,
  autoHandleInterruptions: true,
  autoUpdateMetadata: true,
  // Buffer tuning for smoother seeks and fewer stalls on long audio
  minBuffer: 30,
  maxBuffer: 120,
  playBuffer: 5,
  backBuffer: 60,
  maxCacheSize: 51200, // 50 MB in KB
}

setTrackPlayerSetupConfig(TRACK_PLAYER_SETUP_CONFIG)

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
  reciter?: { name?: string }
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
})

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
    currentIndex: state.currentQueueIndex,
    position: state.progress,
    playbackRate: state.playbackSpeed,
    repeatMode: state.repeatMode,
    isShuffled: state.isShuffled,
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

  useEffect(() => {
    const setupTrackPlayer = async () => {
      try {
        await ensureTrackPlayerReady()

        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
            alwaysPauseOnInterruption: true,
          },
          progressUpdateEventInterval: 2,
          forwardJumpInterval: 15,
          backwardJumpInterval: 15,
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.Stop,
            Capability.SeekTo,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.JumpForward,
            Capability.JumpBackward,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.JumpForward,
            Capability.JumpBackward,
            Capability.Stop,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        })

        addSentryBreadcrumb('Track Player configured', 'info', {
          platform: Platform.OS,
          interruptionsHandled: true,
        })

        if (!hasRestoredRef.current && !isRestoringRef.current) {
          isRestoringRef.current = true
          try {
            const snapshot = await loadQueueSnapshot()
            if (!snapshot || snapshot.trackIds.length === 0) {
              hasRestoredRef.current = true
              return
            }

            const episodes: Episode[] = []
            for (const id of snapshot.trackIds) {
              const downloaded = downloadsService.getDownloadMetadata(id)
              if (downloaded) {
                episodes.push(downloadMetadataToEpisode(downloaded))
                continue
              }

              try {
                const detail = await lectureDetailApi.getLectureDetail({ lectureId: id, useCache: true })
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

            await TrackPlayer.reset()
            await TrackPlayer.add(tracks)
            await TrackPlayer.setPlaylistKey(buildPlaylistKey(filteredQueue))

            const snapshotTrackId = snapshot.trackIds[snapshot.currentIndex]
            const matchedIndex = snapshotTrackId
              ? filteredQueue.findIndex((episode) => String(episode.id) === String(snapshotTrackId))
              : -1
            const safeIndex =
              matchedIndex >= 0
                ? matchedIndex
                : Math.max(0, Math.min(snapshot.currentIndex, tracks.length - 1))
            await TrackPlayer.skip(safeIndex)

            if (snapshot.position > 0) {
              await TrackPlayer.seekTo(snapshot.position)
            }

            const repeatModeValue =
              snapshot.repeatMode === 'one'
                ? RepeatMode.Track
                : snapshot.repeatMode === 'all'
                  ? RepeatMode.Queue
                  : RepeatMode.Off
            await TrackPlayer.setRepeatMode(repeatModeValue)

            if (snapshot.playbackRate) {
              await TrackPlayer.setRate(snapshot.playbackRate)
            }

            const currentEpisode = filteredQueue[safeIndex]
            playerStore.set({
              ...playerStore.get(),
              queue: filteredQueue,
              currentQueueIndex: safeIndex,
              currentEpisode,
              progress: snapshot.position ?? 0,
              duration: currentEpisode?.durationSec ?? 0,
              playbackSpeed: snapshot.playbackRate ?? 1,
              repeatMode: snapshot.repeatMode ?? 'off',
              isShuffled: snapshot.isShuffled ?? false,
              isPlaying: false,
            })

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

    setupTrackPlayer()
  }, [])

  const audioControls = useAudioPlayback({
    onPlaybackStatusUpdate: (status) => {
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
      if (shouldUpdateProgress && status.currentTime !== currentState.progress) {
        updates.progress = status.currentTime
      }
      if (status.duration !== currentState.duration && status.duration > 0) {
        updates.duration = status.duration
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
      const nextState = {
        ...currentState,
        isPlaying: false,
        progress: 0,
      }
      playerStore.set(nextState)
      persistQueueSnapshot(nextState)
    },
  })

  useTrackPlayerEvents([Event.PlaybackError], (event) => {
    const currentState = playerStore.get()
    captureSentryException(new Error('TrackPlayer playback error'), {
      component: 'AudioProvider',
      action: 'playbackError',
      trackId: currentState.currentEpisode?.id,
      errorCode: (event as { code?: string }).code,
      errorMessage: (event as { message?: string }).message,
      level: 'error',
    })

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
  })

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
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

    audioControls.setLockScreenInfo({
      title: nextEpisode.title,
      artist: resolveEpisodeArtistName(nextEpisode),
      artwork: nextEpisode.coverUrl || '',
    })
  })

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
    }
  }, [])

  return <>{children}</>
}
