import { apiClient } from './base.api';
import AsyncStorage from 'expo-sqlite/kv-store';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('../storage/secureStoreCompat', () => ({
  secureStoreCompat: {
    getItemAsync: jest.fn(async (key: string) => key === 'refresh_token' ? 'refresh' : 'old'),
    setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
  },
}));
jest.mock('../config/api.config', () => ({
  API_CONFIG: {
    BASE_URL: 'https://example.test', TIMEOUTS: { DEFAULT: 30000 },
    RETRY: { MAX_ATTEMPTS: 1 }, RATE_LIMIT: { MAX_REQUESTS_PER_SECOND: 100 },
    CACHE: { LECTURES_TTL: 60 },
  },
}));
jest.mock('../config/sentry.config', () => ({
  captureSentryException: jest.fn(), addSentryBreadcrumb: jest.fn(),
  Sentry: {
    startInactiveSpan: () => ({ setAttributes: jest.fn(), setAttribute: jest.fn(), end: jest.fn() }),
    metrics: { count: jest.fn(), distribution: jest.fn() },
    logger: { warn: jest.fn(), info: jest.fn() },
  },
}));

const response = (status: number, data: unknown) => ({
  ok: status < 400, status, headers: new Headers(), text: async () => JSON.stringify(data),
});
const originalFetch = global.fetch;
beforeEach(async () => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  await apiClient.setAuthToken('old');
});
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

test('concurrent GET callers both finish after one token refresh and one retry', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(response(401, { message: 'Invalid or expired token' }))
    .mockResolvedValueOnce(response(200, { data: { tokens: { access_token: 'new', refresh_token: 'new-refresh' } } }))
    .mockResolvedValueOnce(response(200, { lectures: [1] }));
  const [first, second] = await Promise.all([
    apiClient.get('/lectures', undefined, { useCache: false }),
    apiClient.get('/lectures', undefined, { useCache: false }),
  ]);
  expect(first.data).toEqual({ lectures: [1] });
  expect(second.data).toEqual(first.data);
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect((global.fetch as jest.Mock).mock.calls[2][1].headers.Authorization).toBe('Bearer new');
});

test('a cache hit never waits for network rate-limit capacity', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({
    data: { lectures: [2] }, timestamp: Date.now(), ttl: 60,
  }));
  const rateLimit = jest.spyOn(apiClient as any, 'enforceRateLimit');
  const result = await apiClient.get('/cached');
  expect(result.cached).toBe(true);
  expect(rateLimit).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a rejected retry settles and a later request can succeed', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(response(401, { message: 'Invalid or expired token' }))
    .mockResolvedValueOnce(response(200, { data: { tokens: { access_token: 'new', refresh_token: 'new-refresh' } } }))
    .mockResolvedValueOnce(response(500, { message: 'Server error' }))
    .mockResolvedValueOnce(response(200, { lectures: [3] }));
  await expect(apiClient.get('/retry-error', undefined, { useCache: false })).rejects.toThrow('Server error');
  await expect(apiClient.get('/retry-error', undefined, { useCache: false })).resolves.toMatchObject({ data: { lectures: [3] } });
});
