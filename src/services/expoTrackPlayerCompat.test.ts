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
    emitStatus: (status: Record<string, unknown>) => {
      emit('playbackStatusUpdate', {
        isLoaded: true,
        isBuffering: false,
        playing: false,
        currentTime: player.currentTime,
        duration: player.duration,
        didJustFinish: false,
        ...status,
      })
    },
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
    AudioModule: {
      AudioPlayer: jest.fn(() => player),
    },
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

  test('keeps playing state when native status is both playing and buffering', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      __player: { emitStatus: (status: Record<string, unknown>) => void }
    }

    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.skip(0)
    expoAudioMock.__player.emitStatus({
      isLoaded: true,
      isBuffering: true,
      playing: true,
    })

    await expect(TrackPlayer.getPlaybackState()).resolves.toEqual({ state: State.Playing })
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

  test('falls back to legacy AudioPlayer constructor when native module expects 3 args', async () => {
    const expoAudioMock = jest.requireMock('expo-audio') as {
      createAudioPlayer: jest.Mock
      AudioModule: { AudioPlayer: jest.Mock }
    }

    releasePlayer()
    expoAudioMock.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('Received 4 arguments, but 3 was expected')
    })

    await expect(TrackPlayer.setupPlayer()).resolves.toBeUndefined()

    expect(expoAudioMock.AudioModule.AudioPlayer).toHaveBeenCalledWith(null, 250, true)
  })
})


test('native source failures end loading immediately and report once', async () => {
  await TrackPlayer.reset()
  const player = jest.requireMock('expo-audio').__player
  const onError = jest.fn()
  const sub = TrackPlayer.addEventListener(Event.PlaybackError, onError)
  await TrackPlayer.add({ id: 'broken', url: 'https://example.com/missing.mp3', title: 'Missing' })
  player.emitStatus({ error: 'HTTP 404', isLoaded: false, isBuffering: true })
  player.emitStatus({ error: 'HTTP 404', isLoaded: false, isBuffering: true })
  expect(await TrackPlayer.getPlaybackState()).toEqual({ state: State.Error })
  player.emitStatus({ error: null, isLoaded: false, isBuffering: true })
  expect(await TrackPlayer.getPlaybackState()).toEqual({ state: State.Error })
  expect(onError).toHaveBeenCalledTimes(1)
  sub.remove()
})

describe('mid-stream source failures', () => {
  const startStreaming = async (positionSeconds: number) => {
    await TrackPlayer.reset()
    const player = jest.requireMock('expo-audio').__player
    await TrackPlayer.add({ id: 'long', url: 'https://example.com/long.mp3', title: 'Long' })
    await TrackPlayer.play()
    player.currentTime = positionSeconds
    player.emitStatus({ playing: true, currentTime: positionSeconds })
    return player
  }

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('reload the track at the last position once the network is back', async () => {
    const player = await startStreaming(180)
    const onError = jest.fn()
    const sub = TrackPlayer.addEventListener(Event.PlaybackError, onError)
    player.replace.mockClear()
    player.seekTo.mockClear()

    player.emitStatus({ error: 'Source error', isLoaded: false, isBuffering: true })

    expect(onError).not.toHaveBeenCalled()
    expect(await TrackPlayer.getPlaybackState()).toEqual({ state: State.Buffering })

    await jest.advanceTimersByTimeAsync(2000)

    expect(player.replace).toHaveBeenCalledWith('https://example.com/long.mp3')
    expect(player.seekTo).toHaveBeenCalledWith(180)
    expect(player.play).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    sub.remove()
  })

  test('report the failure once the retries run out', async () => {
    const player = await startStreaming(180)
    const onError = jest.fn()
    const sub = TrackPlayer.addEventListener(Event.PlaybackError, onError)
    player.replace.mockClear()
    player.replace.mockImplementation(() => {
      player.emitStatus({ error: 'Source error', isLoaded: false, isBuffering: true })
    })

    player.emitStatus({ error: 'Source error', isLoaded: false, isBuffering: true })
    await jest.advanceTimersByTimeAsync(60_000)

    expect(player.replace).toHaveBeenCalledTimes(3)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(await TrackPlayer.getPlaybackState()).toEqual({ state: State.Error })
    sub.remove()
    player.replace.mockReset()
  })

  test('do not resume a track the listener paused while waiting', async () => {
    const player = await startStreaming(180)
    player.replace.mockClear()

    player.emitStatus({ error: 'Source error', isLoaded: false, isBuffering: true })
    await TrackPlayer.pause()
    await jest.advanceTimersByTimeAsync(20_000)

    expect(player.replace).not.toHaveBeenCalled()
    expect(await TrackPlayer.getPlaybackState()).toEqual({ state: State.Paused })
  })
})

afterAll(() => releasePlayer())
