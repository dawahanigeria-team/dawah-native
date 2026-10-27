import { captureSentryException } from './config/sentry.config'

export type PlaybackErrorEvent = { code?: string; message?: string }

export const reportPlaybackError = async (
  event: PlaybackErrorEvent,
  trackId: string | undefined,
): Promise<void> => {
  captureSentryException(new Error('TrackPlayer playback error'), {
    component: 'AudioProvider',
    action: 'playbackError',
    trackId,
    errorCode: event.code,
    errorMessage: event.message,
    level: 'error',
  })
}
