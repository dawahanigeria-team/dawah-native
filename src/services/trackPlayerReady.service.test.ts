jest.mock('react-native-track-player', () => ({
  setupPlayer: jest.fn().mockResolvedValue(undefined),
}))

import TrackPlayer from 'react-native-track-player'
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
