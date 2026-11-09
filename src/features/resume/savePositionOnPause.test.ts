import TrackPlayer, { Event, State } from '../../services/expoTrackPlayerCompat';
import { historyService } from '../../services/history.service';
import type { Episode } from '../../types/types';
import { saveResumePositionOnPause } from './savePositionOnPause';

const mockListeners = new Map<string, (payload: unknown) => void>();

jest.mock('../../services/expoTrackPlayerCompat', () => ({
  __esModule: true,
  State: { Playing: 'playing', Paused: 'paused', Buffering: 'buffering' },
  Event: { PlaybackState: 'playback-state' },
  default: {
    addEventListener: jest.fn((event: string, listener: (payload: unknown) => void) => {
      mockListeners.set(event, listener);
      return { remove: () => mockListeners.delete(event) };
    }),
    getActiveTrack: jest.fn(),
    getProgress: jest.fn(),
  },
}));

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

const lecture: Episode = {
  id: '42',
  title: 'Riyadus Saliheen Section 04',
  lecturerName: 'Ustadh',
  durationSec: 3118,
  coverUrl: '',
  audioUrl: 'https://example.com/42.mp3',
  seriesId: '',
  plays: 0,
  liked: false,
  language: 'English',
  downloads: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
};

const listenerAt = (positionSec: number) => {
  (TrackPlayer.getActiveTrack as jest.Mock).mockResolvedValue({ id: '42' });
  (TrackPlayer.getProgress as jest.Mock).mockResolvedValue({ position: positionSec, duration: 3118 });
};

const emitState = async (state: string) => {
  mockListeners.get(Event.PlaybackState)?.({ state });
  await new Promise((resolve) => setImmediate(resolve));
};

test('a seek made just before pausing is what Resume returns to', async () => {
  const subscription = saveResumePositionOnPause();
  await historyService.recordPosition(lecture, 100);

  listenerAt(1300);
  await emitState(State.Paused);

  expect(await historyService.getProgress('42')).toBe(1300);
  subscription.remove();
});

test('buffering mid-lecture is not treated as a pause', async () => {
  const subscription = saveResumePositionOnPause();
  listenerAt(1300);
  await emitState(State.Paused);

  listenerAt(1500);
  await emitState(State.Buffering);

  expect(await historyService.getProgress('42')).toBe(1300);
  subscription.remove();
});
