jest.mock('./expoTrackPlayerCompat', () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
}))

import TrackPlayer from './expoTrackPlayerCompat'
import {
  ensureTrackPlayerReady,
  setTrackPlayerSetupPromise,
  resetTrackPlayerReadyState,
} from './trackPlayerReady.service'

afterEach(() => {
  resetTrackPlayerReadyState()
  ;(TrackPlayer.setupPlayer as jest.Mock).mockClear()
})

test('ensureTrackPlayerReady calls setupPlayer when no setup promise', async () => {
  await ensureTrackPlayerReady()
  expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(1)
})

test('ensureTrackPlayerReady waits for existing setup promise', async () => {
  const setupPromise = Promise.resolve()
  setTrackPlayerSetupPromise(setupPromise)

  await ensureTrackPlayerReady()
  expect(TrackPlayer.setupPlayer).not.toHaveBeenCalled()
})

test('ensureTrackPlayerReady treats already initialized error as ready', async () => {
  ;(TrackPlayer.setupPlayer as jest.Mock).mockRejectedValueOnce(
    new Error('The player has already been initialized via setupPlayer.')
  )

  await expect(ensureTrackPlayerReady()).resolves.toBeUndefined()
  await expect(ensureTrackPlayerReady()).resolves.toBeUndefined()
  expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(1)
})
