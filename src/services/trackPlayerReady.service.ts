import TrackPlayer from 'react-native-track-player'

let setupPromise: Promise<void> | null = null
let isReady = false

export const setTrackPlayerSetupPromise = (promise: Promise<void>) => {
  setupPromise = promise
  promise
    .then(() => {
      isReady = true
    })
    .catch(() => {
      isReady = false
    })
}

export const ensureTrackPlayerReady = async (): Promise<void> => {
  if (isReady) return

  if (setupPromise) {
    await setupPromise
    return
  }

  await TrackPlayer.setupPlayer()
  isReady = true
}

export const resetTrackPlayerReadyState = () => {
  setupPromise = null
  isReady = false
}
