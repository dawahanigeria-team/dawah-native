import TrackPlayer, { Event, State } from './expoTrackPlayerCompat'
import { createAudioPlayer } from 'expo-audio'

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

  test('returns playing state after play', async () => {
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    await TrackPlayer.skip(0)
    await TrackPlayer.play()

    const playbackState = await TrackPlayer.getPlaybackState()
    expect(playbackState.state).toBe(State.Playing)
  })

  test('reset disposes player instead of replacing with null source', async () => {
    const createAudioPlayerMock = createAudioPlayer as jest.Mock
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A' })
    const callsBeforeReset = createAudioPlayerMock.mock.calls.length

    await TrackPlayer.reset()
    await TrackPlayer.add({ id: 'b', url: 'https://example.com/b.mp3', title: 'B' })

    expect(createAudioPlayerMock.mock.calls.length).toBe(callsBeforeReset + 1)
  })

  test('updates now-playing metadata for active track and lock screen', async () => {
    await TrackPlayer.add({ id: 'a', url: 'https://example.com/a.mp3', title: 'A', artist: 'Old' })
    await (TrackPlayer as any).updateNowPlayingMetadata({
      title: 'Updated Title',
      artist: 'Updated Artist',
      artwork: 'https://example.com/artwork.jpg',
    })

    const activeTrack = await TrackPlayer.getActiveTrack()
    expect(activeTrack?.title).toBe('Updated Title')
    expect(activeTrack?.artist).toBe('Updated Artist')
    expect(activeTrack?.artwork).toBe('https://example.com/artwork.jpg')

    const playerInstance = (createAudioPlayer as jest.Mock).mock.results.at(-1)?.value
    expect(playerInstance.updateLockScreenMetadata).toHaveBeenCalled()
  })

  test('exposes playlist key and clears it on reset', async () => {
    await (TrackPlayer as any).setPlaylistKey('playlist:scholars:yoruba')
    expect(await (TrackPlayer as any).getPlaylistKey()).toBe('playlist:scholars:yoruba')

    await TrackPlayer.reset()
    expect(await (TrackPlayer as any).getPlaylistKey()).toBeNull()
  })
})
