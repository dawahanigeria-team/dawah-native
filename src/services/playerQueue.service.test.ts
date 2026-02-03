import AsyncStorage from 'expo-sqlite/kv-store'
import { clearQueueSnapshot, loadQueueSnapshot, saveQueueSnapshot } from './playerQueue.service'

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
