import NetInfo from '@react-native-community/netinfo'
import { addSentryBreadcrumb, captureSentryException } from './config/sentry.config'

export type PlaybackErrorEvent = { code?: string; message?: string }

const isOffline = async (): Promise<boolean> => {
  try {
    const netState = await NetInfo.fetch()
    return netState.isConnected === false || netState.isInternetReachable === false
  } catch {
    return false
  }
}

export const reportPlaybackError = async (
  event: PlaybackErrorEvent,
  trackId: string | undefined,
): Promise<void> => {
  // ExoPlayer reports every failed fetch as "Source error", so a phone with
  // no network files one per tap. The listener already sees the failure on
  // screen, and there is nothing for us to fix.
  if (event.code === 'audio-source-error' && (await isOffline())) {
    addSentryBreadcrumb('Audio source failed while offline', 'playback', {
      trackId,
      errorMessage: event.message,
    })
    return
  }

  captureSentryException(new Error('TrackPlayer playback error'), {
    component: 'AudioProvider',
    action: 'playbackError',
    trackId,
    errorCode: event.code,
    errorMessage: event.message,
    level: 'error',
  })
}
