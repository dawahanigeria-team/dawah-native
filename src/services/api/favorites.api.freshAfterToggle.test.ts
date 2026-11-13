import { favoritesApi } from './favorites.api';

const mockStorage = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStorage.delete(key);
    },
    getAllKeys: async () => [...mockStorage.keys()],
  },
}));
jest.mock('../storage/secureStoreCompat', () => ({
  secureStoreCompat: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));
jest.mock('../config/api.config', () => ({
  API_CONFIG: {
    BASE_URL: 'https://example.test',
    TIMEOUTS: { DEFAULT: 30000 },
    RETRY: { MAX_ATTEMPTS: 1 },
    RATE_LIMIT: { MAX_REQUESTS_PER_SECOND: 100 },
    CACHE: { LECTURES_TTL: 60 },
  },
}));
jest.mock('../config/sentry.config', () => ({
  captureSentryException: jest.fn(),
  addSentryBreadcrumb: jest.fn(),
  Sentry: {
    startInactiveSpan: () => ({ setAttributes: jest.fn(), setAttribute: jest.fn(), end: jest.fn() }),
    metrics: { count: jest.fn(), distribution: jest.fn() },
    logger: { warn: jest.fn(), info: jest.fn() },
  },
}));
jest.mock('../user.service', () => ({
  userService: { getUserId: async () => '42', clearUserId: jest.fn() },
}));

const response = (data: unknown) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: async () => JSON.stringify(data),
});
const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test('the likes list read after liking a lecture is the server list, not a stale copy', async () => {
  global.fetch = jest
    .fn()
    .mockResolvedValueOnce(response({ user_id: 42, audio: [11] }))
    .mockResolvedValueOnce(response({ success: true, message: 'audio added to favorites.' }))
    .mockResolvedValueOnce(response({ user_id: 42, audio: [11, 30000] }));

  expect(await favoritesApi.getFavoriteIds('audio')).toEqual(['11']);
  await favoritesApi.toggleFavorite('30000', 'audio');

  expect(await favoritesApi.getFavoriteIds('audio')).toEqual(['11', '30000']);
});
