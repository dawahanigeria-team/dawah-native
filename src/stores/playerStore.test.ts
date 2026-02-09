import TrackPlayer from '../services/expoTrackPlayerCompat'
import { playerStore, resolveEpisodeArtistName, setAudioControls, usePlayerActions } from './playerStore'
import { downloadsService } from '../services/downloads.service'
import { historyService } from '../services/history.service'
import { ensureTrackPlayerReady } from '../services/trackPlayerReady.service'

jest.mock('../services/expoTrackPlayerCompat', () => ({
  reset: jest.fn(),
  add: jest.fn(),
  skip: jest.fn(),
  play: jest.fn(),
  stop: jest.fn(),
  remove: jest.fn(),
  setPlaylistKey: jest.fn(),
  setRepeatMode: jest.fn(),
  getActiveTrackIndex: jest.fn().mockResolvedValue(0),
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
  ;(TrackPlayer.reset as jest.Mock).mockReset()
  ;(TrackPlayer.add as jest.Mock).mockReset()
  ;(TrackPlayer.skip as jest.Mock).mockReset()
  ;(TrackPlayer.play as jest.Mock).mockReset()
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
})
