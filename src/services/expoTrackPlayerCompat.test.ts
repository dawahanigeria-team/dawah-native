import { createAudioPlayer } from 'expo-audio'
import { logger } from '../utils/logger'
import TrackPlayer, { Event, State, releasePlayer } from './expoTrackPlayerCompat'

jest.mock('expo-audio', () => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>()

  const emit = (event: string, payload: unknown) => {
    const handlers = listeners.get(event)
    if (!handlers) return
    handlers.forEach((handler) => handler(payload))
  }

  const player = {
    playing: false,
    paused: true,
    isLoaded: false,
    isBuffering: false,
    currentTime: 0,
    duration: 120,
    volume: 1,
    playbackRate: 1,
    play: jest.fn(() => {
      player.playing = true
      player.paused = false
      emit('playbackStatusUpdate', {
        isLoaded: true,
        isBuffering: false,
        playing: true,
        currentTime: player.currentTime,
        duration: player.duration,
        didJustFinish: false,
      })
    }),
    pause: jest.fn(() => {
      player.playing = false
      player.paused = true
      emit('playbackStatusUpdate', {
        isLoaded: true,
        isBuffering: false,
        playing: false,
        currentTime: player.currentTime,
        duration: player.duration,
        didJustFinish: false,
      })
    }),
    replace: jest.fn(() => {
      player.isLoaded = true
      player.currentTime = 0
      emit('playbackStatusUpdate', {
        isLoaded: true,
        isBuffering: false,
        playing: false,
        currentTime: 0,
        duration: player.duration,
        didJustFinish: false,
      })
    }),
    seekTo: jest.fn(async (position: number) => {
      player.currentTime = position
    }),
    setPlaybackRate: jest.fn((rate: number) => {
      player.playbackRate = rate
    }),
    setActiveForLockScreen: jest.fn(),
    updateLockScreenMetadata: jest.fn(),
    clearLockScreenControls: jest.fn(),
    addListener: jest.fn((event: string, handler: (payload: unknown) => void) => {
      const handlers = listeners.get(event) ?? new Set()
      handlers.add(handler)
      listeners.set(event, handlers)
      return {
        remove: () => {
          handlers.delete(handler)
        },
      }
    }),
    remove: jest.fn(),
  }

  return {
    createAudioPlayer: jest.fn(() => player),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    __player: player,
  }
})

describe('expoTrackPlayerCompat', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await TrackPlayer.setupPlayer()
    await TrackPlayer.reset()
  })

  test('adds queue items and emits active track change on skip', async () => {
    const onActiveTrackChanged = jest.fn()
    const subscription = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, onActiveTrackChanged)

    await TrackPlayer.add([
      { id: 'a', url: 'https://example.com/a.mp3', title: 'A' },
      { id: 'b', url: 'https://example.com/b.mp3', title: 'B' },
    ])
    await TrackPlayer.skip(1)

    expect(await TrackPlayer.getActiveTrackIndex()).toBe(1)
    expect(onActiveTrackChanged).toHaveBeenCalled()

    subscription.remove()
  })

  test('can add queue without initial activation to avoid double source replace', async () => {
    const createAudioPlayerMock = createAudioPlayer as jest.Mock
    const expoAudioMock = jest.requireMock('expo-audio') as { __player: { replace: jest.Mock } }
    const callsBeforeAdd = createAudioPlayerMock.mock.calls.length
    const track = { id: 'a', url: 'https://example.com/a.mp3', title: 'A' }

    await (TrackPlayer as any).add([track], { activate: false })
    expect(createAudioPlayerMock.mock.calls.length).toBe(callsBeforeAdd)

    await TrackPlayer.skip(0)
    expect(expoAudioMock.__player.replace).toHaveBeenCalledTimes(1)
  })

  test('normalizes remote URLs before loading', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as { __player: { replace: jest.Mock } }
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/audio with {tag}.mp3', title: 'A' })
    await TrackPlayer.skip(0)

    expect(expoAudioMock.__player.replace).toHaveBeenCalledWith(
      'https://example.com/audio%20with%20%7Btag%7D.mp3'
    )
  })

  test('returns playing state after play', async () => {
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.skip(0)
    await TrackPlayer.play()

    const playbackState = await TrackPlayer.getPlaybackState()
    expect(playbackState.state).toBe(State.Playing)
  })

  test('reset keeps native player warm for faster startup', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      createAudioPlayer: jest.Mock
      __player: { remove: jest.Mock }
    }
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })

    await TrackPlayer.reset()

    // Normal reset should not destroy native player resources.
    expect(expoAudioMock.__player.remove).not.toHaveBeenCalled()

    // Re-adding tracks should reuse the same player instance.
    const callsBefore = expoAudioMock.createAudioPlayer.mock.calls.length
    await TrackPlayer.add({ id: 'b', url: 'https://example.com/b.mp3', title: 'B' })
    expect(expoAudioMock.createAudioPlayer.mock.calls.length).toBe(callsBefore)
  })

  test('updates now-playing metadata for active track and lock screen', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      __player: { updateLockScreenMetadata: jest.Mock }
    }
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A', artist: 'Old' })
    await TrackPlayer.play()
    await (TrackPlayer as any).updateNowPlayingMetadata({
      title: 'Updated Title',
      artist: 'Updated Artist',
      artwork: 'https://example.com/artwork.jpg',
    })

    const activeTrack = await TrackPlayer.getActiveTrack()
    expect(activeTrack?.title).toBe('Updated Title')
    expect(activeTrack?.artist).toBe('Updated Artist')
    expect(activeTrack?.artwork).toBe('https://example.com/artwork.jpg')

    expect(expoAudioMock.__player.updateLockScreenMetadata).toHaveBeenCalled()
  })

  test('lock screen activation debug log omits method type internals', async () => {
    const debugSpy = jest.spyOn(logger, 'debug')

    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.play()

    const activationLogCall = debugSpy.mock.calls.find((call) => call[0] === '[LockScreen] Activating lock screen controls')
    expect(activationLogCall).toBeDefined()
    expect(String(activationLogCall?.[1])).not.toContain('methodTypes')

    debugSpy.mockRestore()
  })

  test('exposes playlist key and clears it on reset', async () => {
    await (TrackPlayer as any).setPlaylistKey('playlist:scholars:yoruba')
    expect(await (TrackPlayer as any).getPlaylistKey()).toBe('playlist:scholars:yoruba')

    await TrackPlayer.reset()
    expect(await (TrackPlayer as any).getPlaylistKey()).toBeNull()
  })

  test('reset continues cleanup when clearing lock screen controls throws', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      __player: { clearLockScreenControls: jest.Mock }
    }

    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.skip(0)
    await (TrackPlayer as any).setPlaylistKey('playlist:resilience')
    expoAudioMock.__player.clearLockScreenControls.mockImplementationOnce(() => {
      throw new Error('lock-screen failure')
    })

    await expect(TrackPlayer.reset()).resolves.toBeUndefined()
    await expect(TrackPlayer.getActiveTrackIndex()).resolves.toBeNull()
    await expect(TrackPlayer.getActiveTrack()).resolves.toBeNull()
    await expect((TrackPlayer as any).getPlaylistKey()).resolves.toBeNull()
    await expect(TrackPlayer.getPlaybackState()).resolves.toEqual({ state: State.None })
  })

  test('releasePlayer fully destroys player and resets state', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      __player: { remove: jest.Mock; pause: jest.Mock; clearLockScreenControls: jest.Mock }
    }
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.play()

    releasePlayer()

    expect(expoAudioMock.__player.remove).toHaveBeenCalled()
    await expect(TrackPlayer.getActiveTrackIndex()).resolves.toBeNull()
    await expect(TrackPlayer.getActiveTrack()).resolves.toBeNull()
    await expect(TrackPlayer.getPlaybackState()).resolves.toEqual({ state: State.None })
  })
})
