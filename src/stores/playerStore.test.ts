import TrackPlayer from '../services/expoTrackPlayerCompat'
import { playerStore, resolveEpisodeArtistName, setAudioControls, usePlayerActions } from './playerStore'
import { downloadsService } from '../services/downloads.service'
import { historyService } from '../services/history.service'
import { ensureTrackPlayerReady } from '../services/trackPlayerReady.service'
import AsyncStorage from 'expo-sqlite/kv-store'

jest.mock('../services/expoTrackPlayerCompat', () => ({
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
  RepeatMode: {
    Off: 0,
    Track: 1,
    Queue: 2,
  },
  reset: jest.fn(),
  add: jest.fn(),
  skip: jest.fn(),
  play: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
  setPlaylistKey: jest.fn(),
  setRepeatMode: jest.fn(),
  getActiveTrackIndex: jest.fn().mockResolvedValue(0),
  getPlaybackState: jest.fn(),
  getProgress: jest.fn(),
  skipToNext: jest.fn(),
  skipToPrevious: jest.fn(),
}))

jest.mock('../services/downloads.service', () => ({
  downloadsService: {
    getPlaybackUri: jest.fn(),
    isDownloaded: jest.fn(),
  },
}))

jest.mock('../services/history.service', () => ({
  historyService: {
    addToHistory: jest.fn(),
  },
}))

jest.mock('../services/trackPlayerReady.service', () => ({
  ensureTrackPlayerReady: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../services/config/sentry.config', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureSentryException: jest.fn(),
}))

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('expo-sqlite/kv-store', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockGetPlaybackUri = downloadsService.getPlaybackUri as jest.Mock
const mockIsDownloaded = downloadsService.isDownloaded as jest.Mock
const mockAddToHistory = historyService.addToHistory as jest.Mock
const mockEnsureReady = ensureTrackPlayerReady as jest.Mock
const mockGetPlaybackState = TrackPlayer.getPlaybackState as jest.Mock
const mockGetProgress = TrackPlayer.getProgress as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock

afterEach(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  playerStore.set({
    currentEpisode: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    isExpanded: false,
    isLoading: false,
    playbackSpeed: 1,
    volume: 1,
    isDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    errorMessage: null,
    queue: [],
    originalQueue: [],
    currentQueueIndex: -1,
    isShuffled: false,
    repeatMode: 'off',
  })

  setAudioControls({
    loadAudio: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    togglePlayPause: jest.fn(),
    seekTo: jest.fn(),
    seekForward: jest.fn(),
    seekBackward: jest.fn(),
    setPlaybackRate: jest.fn(),
    setVolume: jest.fn(),
    stop: jest.fn(),
    unload: jest.fn(),
    setLockScreenInfo: jest.fn(),
    status: {
      isLoaded: true,
      isPlaying: false,
      isPaused: false,
      isBuffering: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      playbackRate: 1,
    },
    isReady: true,
    player: TrackPlayer,
  })

  mockGetPlaybackUri.mockReset()
  mockIsDownloaded.mockReset()
  mockAddToHistory.mockReset()
  mockEnsureReady.mockReset()
  mockEnsureReady.mockResolvedValue(undefined)
  ;(TrackPlayer.reset as jest.Mock).mockReset()
  ;(TrackPlayer.add as jest.Mock).mockReset()
  ;(TrackPlayer.skip as jest.Mock).mockReset()
  ;(TrackPlayer.play as jest.Mock).mockReset()
  mockSetItem.mockReset()
  mockGetPlaybackState.mockReset()
  mockGetProgress.mockReset()
  mockGetPlaybackState.mockResolvedValue({ state: 'playing' })
  mockGetProgress.mockResolvedValue({ position: 1, duration: 120, buffered: 1 })
})

test('playEpisode builds queue and uses TrackPlayer', async () => {
  const episode = {
    id: '1',
    title: 'Lecture 1',
    audioUrl: 'https://example.com/audio.mp3',
    lecturerName: 'Ustadh',
    coverUrl: 'cover.png',
    durationSec: 120,
    seriesId: '',
    plays: 0,
    liked: false,
    language: 'Unknown',
    downloads: 0,
    createdAt: new Date().toISOString(),
  }

  mockGetPlaybackUri.mockReturnValue('file:///audio.mp3')
  mockIsDownloaded.mockReturnValue(false)
  mockAddToHistory.mockResolvedValue(undefined)

  const actions = usePlayerActions()
  await actions.playEpisode(episode)

  expect(mockEnsureReady).toHaveBeenCalledTimes(1)
  expect(TrackPlayer.reset).toHaveBeenCalledTimes(1)
  expect(TrackPlayer.add).toHaveBeenCalledTimes(1)
  expect(TrackPlayer.play).toHaveBeenCalledTimes(1)
})

test('playEpisode retries playback when startup stalls before timing out', async () => {
  jest.useFakeTimers()

  const episode = {
    id: 'retry-1',
    title: 'Lecture Retry',
    audioUrl: 'https://example.com/audio.mp3',
    lecturerName: 'Ustadh',
    coverUrl: 'cover.png',
    durationSec: 120,
    seriesId: '',
    plays: 0,
    liked: false,
    language: 'Unknown',
    downloads: 0,
    createdAt: new Date().toISOString(),
  }

  let playAttempts = 0

  mockGetPlaybackUri.mockReturnValue('file:///audio.mp3')
  mockIsDownloaded.mockReturnValue(false)
  mockAddToHistory.mockResolvedValue(undefined)
  ;(TrackPlayer.play as jest.Mock).mockImplementation(async () => {
    playAttempts += 1
  })
  mockGetPlaybackState.mockImplementation(async () => ({
    state: playAttempts >= 2 ? 'playing' : 'paused',
  }))
  mockGetProgress.mockResolvedValue({ position: 0, duration: 120, buffered: 0 })

  const actions = usePlayerActions()
  const playPromise = actions.playEpisode(episode)

  await jest.advanceTimersByTimeAsync(4000)
  await playPromise

  expect(TrackPlayer.play).toHaveBeenCalledTimes(2)
  expect(playerStore.get().isPlaying).toBe(true)
  expect(playerStore.get().errorMessage).toBeNull()
})

test('setRepeatMode does not persist originalQueue payloads to AsyncStorage', async () => {
  const queueEpisode = {
    id: 'queue-1',
    title: 'Lecture One',
    audioUrl: 'https://example.com/audio.mp3',
    lecturerName: 'Ustadh',
    coverUrl: 'cover.png',
    durationSec: 120,
    seriesId: '',
    plays: 0,
    liked: false,
    language: 'Unknown',
    downloads: 0,
    createdAt: new Date().toISOString(),
  }

  playerStore.set({
    ...playerStore.get(),
    currentEpisode: queueEpisode,
    queue: [queueEpisode],
    originalQueue: [queueEpisode],
    currentQueueIndex: 0,
  })

  usePlayerActions().setRepeatMode('all')
  await Promise.resolve()

  expect(mockSetItem).toHaveBeenCalled()
  const persistedState = JSON.parse(mockSetItem.mock.calls.at(-1)?.[1] as string)
  expect(persistedState.queue).toEqual([])
  expect(persistedState.originalQueue).toEqual([])
})

test('resolveEpisodeArtistName prefers lecturer name then reciter fields', () => {
  expect(
    resolveEpisodeArtistName({
      id: '1',
      title: 'Lecture',
      audioUrl: 'https://example.com/audio.mp3',
      lecturerName: 'Shaykh Lecturer',
      coverUrl: 'cover.png',
      durationSec: 120,
      seriesId: '',
      plays: 0,
      liked: false,
      language: 'Unknown',
      downloads: 0,
      createdAt: new Date().toISOString(),
    })
  ).toBe('Shaykh Lecturer')

  expect(
    resolveEpisodeArtistName({
      id: '2',
      title: 'Recitation',
      audioUrl: 'https://example.com/audio.mp3',
      coverUrl: 'cover.png',
      durationSec: 120,
      seriesId: '',
      plays: 0,
      liked: false,
      language: 'Unknown',
      downloads: 0,
      createdAt: new Date().toISOString(),
      reciter: { name: 'Qari Reciter' },
    } as any)
  ).toBe('Qari Reciter')

  expect(
    resolveEpisodeArtistName({
      id: '3',
      title: 'Recitation',
      audioUrl: 'https://example.com/audio.mp3',
      lecturerName: 'DawahNigeria',
      coverUrl: 'cover.png',
      durationSec: 120,
      seriesId: '',
      plays: 0,
      liked: false,
      language: 'Unknown',
      downloads: 0,
      createdAt: new Date().toISOString(),
      reciter_name: 'Shaykh Fallback',
    } as any)
  ).toBe('Shaykh Fallback')

  expect(
    resolveEpisodeArtistName({
      id: '4',
      title: 'Lecture',
      audioUrl: 'https://example.com/audio.mp3',
      lecturerName: 'Ustadh Lecture',
      coverUrl: 'cover.png',
      durationSec: 120,
      seriesId: '',
      plays: 0,
      liked: false,
      language: 'Unknown',
      downloads: 0,
      createdAt: new Date().toISOString(),
      reciter_name: 'Qari Should Not Win',
      isReciter: false,
    } as any)
  ).toBe('Ustadh Lecture')

  expect(
    resolveEpisodeArtistName({
      id: '5',
      title: 'Quran Recitation',
      audioUrl: 'https://example.com/audio.mp3',
      lecturerName: 'Ustadh Lecture',
      coverUrl: 'cover.png',
      durationSec: 120,
      seriesId: '',
      plays: 0,
      liked: false,
      language: 'Unknown',
      downloads: 0,
      createdAt: new Date().toISOString(),
      reciter_name: 'Qari Preferred',
      isReciter: true,
    } as any)
  ).toBe('Qari Preferred')
})
