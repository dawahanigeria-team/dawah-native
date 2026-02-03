jest.mock('react-native-track-player', () => ({
  State: {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Loading: 'loading',
    Buffering: 'buffering',
    Error: 'error',
    Ended: 'ended',
  },
  Event: {},
  usePlaybackState: jest.fn(() => ({ state: 'ready' })),
  useProgress: jest.fn(() => ({ position: 0, duration: 0, buffered: 0 })),
  useActiveTrack: jest.fn(() => undefined),
  useTrackPlayerEvents: jest.fn(),
  default: {
    reset: jest.fn(),
    add: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    stop: jest.fn(),
    seekTo: jest.fn(),
    setRate: jest.fn(),
    setVolume: jest.fn(),
    getCurrentTrack: jest.fn(),
    updateMetadataForTrack: jest.fn(),
  },
}))

import { State } from 'react-native-track-player'
import { buildPlaybackStatus } from './useAudioPlayback'

const baseProgress = { position: 10, duration: 100, buffered: 25 }

test('buildPlaybackStatus maps playing state', () => {
  const status = buildPlaybackStatus({
    playbackState: { state: State.Playing },
    progress: baseProgress,
    volume: 1,
    rate: 1,
    isLoaded: true,
  })

  expect(status.isPlaying).toBe(true)
  expect(status.isBuffering).toBe(false)
  expect(status.isPaused).toBe(false)
  expect(status.currentTime).toBe(10)
  expect(status.duration).toBe(100)
})

test('buildPlaybackStatus maps buffering state', () => {
  const status = buildPlaybackStatus({
    playbackState: { state: State.Buffering },
    progress: baseProgress,
    volume: 0.8,
    rate: 1.25,
    isLoaded: true,
  })

  expect(status.isBuffering).toBe(true)
  expect(status.isPlaying).toBe(false)
  expect(status.volume).toBe(0.8)
  expect(status.playbackRate).toBe(1.25)
})
