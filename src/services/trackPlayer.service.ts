import TrackPlayer, { Event } from 'react-native-track-player'
import { addSentryBreadcrumb, captureSentryException } from './config/sentry.config'

const safeCall = async (action: () => Promise<void> | void): Promise<void> => {
  try {
    await action()
  } catch (error) {
    captureSentryException(error as Error, {
      component: 'playbackService',
      action: 'remoteEvent',
    })
  }
}

const registerRemoteEventHandlers = () => {
  addSentryBreadcrumb('TrackPlayer playback service started', 'trackplayer')
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    addSentryBreadcrumb('TrackPlayer RemotePlay', 'trackplayer')
    void safeCall(() => TrackPlayer.play())
  })

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    addSentryBreadcrumb('TrackPlayer RemotePause', 'trackplayer')
    void safeCall(() => TrackPlayer.pause())
  })

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    addSentryBreadcrumb('TrackPlayer RemoteNext', 'trackplayer')
    void safeCall(() => TrackPlayer.skipToNext())
  })

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    addSentryBreadcrumb('TrackPlayer RemotePrevious', 'trackplayer')
    void safeCall(() => TrackPlayer.skipToPrevious())
  })

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    addSentryBreadcrumb('TrackPlayer RemoteSeek', 'trackplayer', {
      position: event.position,
    })
    void safeCall(() => TrackPlayer.seekTo(event.position))
  })

  TrackPlayer.addEventListener(Event.RemoteJumpForward, (event) => {
    addSentryBreadcrumb('TrackPlayer RemoteJumpForward', 'trackplayer', {
      interval: event.interval,
    })
    void safeCall(async () => {
      const position = await TrackPlayer.getPosition()
      await TrackPlayer.seekTo(position + event.interval)
    })
  })

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, (event) => {
    addSentryBreadcrumb('TrackPlayer RemoteJumpBackward', 'trackplayer', {
      interval: event.interval,
    })
    void safeCall(async () => {
      const position = await TrackPlayer.getPosition()
      await TrackPlayer.seekTo(Math.max(0, position - event.interval))
    })
  })

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    addSentryBreadcrumb('TrackPlayer RemoteStop', 'trackplayer')
    void safeCall(() => TrackPlayer.stop())
  })

  TrackPlayer.addEventListener(Event.RemoteDuck, (event) => {
    addSentryBreadcrumb('TrackPlayer RemoteDuck', 'trackplayer', {
      paused: event.paused,
      permanent: event.permanent,
    })
    if (event.permanent) {
      void safeCall(() => TrackPlayer.stop())
    } else if (event.paused) {
      void safeCall(() => TrackPlayer.pause())
    } else {
      void safeCall(() => TrackPlayer.play())
    }
  })
}

const playbackService = async () => {
  registerRemoteEventHandlers()
}

export default playbackService
