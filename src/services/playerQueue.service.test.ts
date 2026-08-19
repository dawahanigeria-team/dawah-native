import AsyncStorage from 'expo-sqlite/kv-store'
import {
  clearQueueSnapshot,
  loadQueueSnapshot,
  saveQueueSnapshot,
  toQueueEpisodeSnapshot,
} from './playerQueue.service'

jest.mock('expo-sqlite/kv-store', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}))

const mockGetItem = AsyncStorage.getItem as jest.Mock
const mockSetItem = AsyncStorage.setItem as jest.Mock
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock

beforeEach(() => {
  mockGetItem.mockReset()
  mockSetItem.mockReset()
  mockRemoveItem.mockReset()
})

test('saves and loads a minimal queue snapshot', async () => {
  const snapshot = {
    trackIds: ['1', '2'],
    currentIndex: 1,
    position: 120,
    playbackRate: 1.25,
    repeatMode: 'all' as const,
    isShuffled: true,
    currentTrack: { id: '2', title: 'T', artist: 'A', artwork: 'url' },
  }

  mockGetItem.mockResolvedValueOnce(JSON.stringify(snapshot))

  await saveQueueSnapshot(snapshot)

  expect(mockSetItem).toHaveBeenCalledTimes(1)

  const loaded = await loadQueueSnapshot()
  expect(loaded).toEqual(snapshot)
})

test('clears snapshot', async () => {
  await clearQueueSnapshot()
  expect(mockRemoveItem).toHaveBeenCalledTimes(1)
})

test('stores only the queue metadata needed for offline restoration', () => {
  const snapshot = toQueueEpisodeSnapshot({
    id: 'lecture-1',
    title: 'Lecture',
    durationSec: 60,
    coverUrl: 'cover-small',
    coverUrlLarge: 'cover-large',
    audioUrl: 'https://example.com/audio.mp3',
    seriesId: 'series-1',
    plays: 10,
    liked: false,
    language: 'Hausa',
    downloads: 2,
    createdAt: '2026-08-19T00:00:00.000Z',
    lecturerName: 'Scholar',
    raw: { rpname: 'unused raw payload' },
  })

  expect(snapshot).toMatchObject({
    id: 'lecture-1',
    audioUrl: 'https://example.com/audio.mp3',
    lecturerName: 'Scholar',
  })
  expect(snapshot).not.toHaveProperty('coverUrlLarge')
  expect(snapshot).not.toHaveProperty('raw')
})
