import AsyncStorage from 'expo-sqlite/kv-store';
import {
  getCachedLecturerFollowState,
  setCachedLecturerFollowState,
} from './lecturerFollowCache.service';

jest.mock('expo-sqlite/kv-store', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
});

test('returns false when no cached state exists', async () => {
  mockGetItem.mockResolvedValue(null);

  const result = await getCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
  });

  expect(result).toBe(false);
});

test('persists followed state and reads it back', async () => {
  mockGetItem.mockResolvedValueOnce('{}');
  mockSetItem.mockResolvedValueOnce(undefined);
  mockGetItem.mockResolvedValueOnce(
    JSON.stringify({
      '123:rp:456': true,
    }),
  );

  await setCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
    following: true,
  });

  const result = await getCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
  });

  expect(mockSetItem).toHaveBeenCalledTimes(1);
  expect(result).toBe(true);
});

test('removes cached key when lecturer is unfollowed', async () => {
  mockGetItem.mockResolvedValueOnce(
    JSON.stringify({
      '123:rp:456': true,
    }),
  );
  mockSetItem.mockResolvedValueOnce(undefined);
  mockGetItem.mockResolvedValueOnce('{}');

  await setCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
    following: false,
  });

  const result = await getCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
  });

  expect(result).toBe(false);
});

test('keeps lecturer and reciter follow states isolated', async () => {
  mockGetItem.mockResolvedValueOnce('{}');
  mockSetItem.mockResolvedValueOnce(undefined);
  mockGetItem.mockResolvedValue(
    JSON.stringify({
      '123:reciter:456': true,
    }),
  );

  await setCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'reciter',
    following: true,
  });

  const lecturerState = await getCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'rp',
  });
  const reciterState = await getCachedLecturerFollowState({
    userId: '123',
    lecturerId: '456',
    type: 'reciter',
  });

  expect(lecturerState).toBe(false);
  expect(reciterState).toBe(true);
});
