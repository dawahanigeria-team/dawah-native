import TrackPlayer, { Event } from 'react-native-track-player'

const safeCall = async (action: () => Promise<void> | void): Promise<void> => {
  try {
    await action()
  } catch {
    // Swallow errors to avoid crashing background service
  }
}

const registerRemoteEventHandlers = () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void safeCall(() => TrackPlayer.play())
  })

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void safeCall(() => TrackPlayer.pause())
  })

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void safeCall(() => TrackPlayer.skipToNext())
  })

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void safeCall(() => TrackPlayer.skipToPrevious())
  })

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    void safeCall(() => TrackPlayer.seekTo(event.position))
  })

  TrackPlayer.addEventListener(Event.RemoteJumpForward, (event) => {
    void safeCall(async () => {
      const position = await TrackPlayer.getPosition()
      await TrackPlayer.seekTo(position + event.interval)
    })
  })

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, (event) => {
    void safeCall(async () => {
      const position = await TrackPlayer.getPosition()
      await TrackPlayer.seekTo(Math.max(0, position - event.interval))
    })
  })

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void safeCall(() => TrackPlayer.stop())
  })

  TrackPlayer.addEventListener(Event.RemoteDuck, (event) => {
    if (event.paused) {
      void safeCall(() => TrackPlayer.pause())
    }
  })
}

const playbackService = async () => {
  registerRemoteEventHandlers()
}

export default playbackService
