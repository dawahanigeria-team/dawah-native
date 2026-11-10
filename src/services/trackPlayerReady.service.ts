import TrackPlayer, { type SetupPlayerOptions } from './expoTrackPlayerCompat'

let setupPromise: Promise<void> | null = null
let isReady = false
let setupConfig: SetupPlayerOptions | undefined

export const setTrackPlayerSetupPromise = (promise: Promise<void>) => {
  setupPromise = promise
  promise
    .then(() => {
      isReady = true
    })
    .catch(() => {
      isReady = false
      if (setupPromise === promise) setupPromise = null
    })
}

export const setTrackPlayerSetupConfig = (config: SetupPlayerOptions) => {
  setupConfig = config
}

export const isTrackPlayerAlreadyInitializedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const message = (error as Error).message ?? ''
  return message.includes('already been initialized') && message.includes('setupPlayer')
}

export const ensureTrackPlayerReady = async (): Promise<void> => {
  if (isReady) return

  if (setupPromise) {
    const pendingSetup = setupPromise
    try {
      await pendingSetup
      return
    } catch (error) {
      if (isTrackPlayerAlreadyInitializedError(error)) {
        isReady = true
        return
      }
      if (setupPromise === pendingSetup) setupPromise = null
      throw error
    }
  }

  const promise = TrackPlayer.setupPlayer(setupConfig).catch((error) => {
    if (isTrackPlayerAlreadyInitializedError(error)) {
      return
    }
    throw error
  })
  setupPromise = promise

  try {
    await promise
    isReady = true
  } catch (error) {
    if (isTrackPlayerAlreadyInitializedError(error)) {
      isReady = true
      return
    }
    if (setupPromise === promise) setupPromise = null
    throw error
  }
}

export const resetTrackPlayerReadyState = () => {
  setupPromise = null
  isReady = false
}
