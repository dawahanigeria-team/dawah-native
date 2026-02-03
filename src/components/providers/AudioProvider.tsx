/**
 * AudioProvider Component
 * Initializes and manages the audio playback system using Track Player
 * Syncs audio status with the playerStore
 */

import TrackPlayer, {
  AndroidAudioContentType,
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
} from 'react-native-track-player'
import React, { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useAudioPlayback } from '../../hooks/useAudioPlayback'
import { addSentryBreadcrumb, captureSentryException } from '../../services/config/sentry.config'
import { playerStore, setAudioControls } from '../../stores/playerStore'

interface AudioProviderProps {
  children: React.ReactNode
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const isInitializedRef = useRef(false)

  useEffect(() => {
    const setupTrackPlayer = async () => {
      try {
        await TrackPlayer.setupPlayer({
          iosCategory: IOSCategory.Playback,
          iosCategoryMode: IOSCategoryMode.Default,
          iosCategoryOptions: [
            IOSCategoryOptions.AllowBluetooth,
            IOSCategoryOptions.AllowAirPlay,
          ],
          androidAudioContentType: AndroidAudioContentType.Music,
          autoHandleInterruptions: true,
          autoUpdateMetadata: true,
        })

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
        playerStore.set({
          ...currentState,
          ...updates,
        })
      }
    },
    onPlaybackFinished: () => {
      const currentState = playerStore.get()
      playerStore.set({
        ...currentState,
        isPlaying: false,
        progress: 0,
      })
    },
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
