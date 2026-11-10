import AsyncStorage from 'expo-sqlite/kv-store';
import { historyService } from './history.service';
import { Episode } from '../types/types';

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    },
  };
});

const episode = (id: string): Episode => ({
  id,
  title: `Lecture ${id}`,
  lecturerName: 'Ustadh',
  durationSec: 3000,
  coverUrl: '',
  audioUrl: 'https://example.com/a.mp3',
  seriesId: '',
  plays: 0,
  liked: false,
  language: 'English',
  downloads: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('recordPosition', () => {
  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-11-08T10:00:00Z') });
    await AsyncStorage.removeItem('lecture_history');
    (AsyncStorage.setItem as jest.Mock).mockClear();
    // The throttle is per service instance, so start each test on a new lecture.
    await historyService.recordPosition(episode('reset'), 1);
    jest.setSystemTime(new Date('2026-11-08T10:05:00Z'));
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('records a lecture that never went through playEpisode', async () => {
    await historyService.recordPosition(episode('queued'), 90);

    expect(await historyService.getProgress('queued')).toBe(90);
  });

  test('writes at most once per interval for the same lecture', async () => {
    await historyService.recordPosition(episode('a'), 100);
    await historyService.recordPosition(episode('a'), 101);

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(await historyService.getProgress('a')).toBe(100);
  });

  test('writes again once the interval has passed', async () => {
    await historyService.recordPosition(episode('a'), 100);
    jest.setSystemTime(new Date('2026-11-08T10:05:16Z'));
    await historyService.recordPosition(episode('a'), 116);

    expect(await historyService.getProgress('a')).toBe(116);
  });

  test('ignores a position that has not started', async () => {
    await historyService.recordPosition(episode('b'), 0);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
