import { apiClient } from './base.api';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })) },
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
    RETRY: {
      MAX_ATTEMPTS: 3,
      INITIAL_DELAY: 1,
      MAX_DELAY: 5,
      BACKOFF_FACTOR: 2,
      RETRY_CONDITIONS: [500],
    },
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

const okResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: async () => JSON.stringify(data),
});
const stalledBodyResponse = () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  text: () => new Promise<string>(() => {}),
});

const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
});

test('a stalled response body times out, is aborted, and does not poison the next GET', async () => {
  (global.fetch as jest.Mock)
    .mockResolvedValueOnce(stalledBodyResponse())
    .mockResolvedValueOnce(okResponse({ lectures: [1] }));

  const options = { timeout: 50, retry: false, useCache: false };
  await expect(apiClient.get('/stalled', undefined, options)).rejects.toMatchObject({
    isTimeout: true,
  });

  const firstSignal = (global.fetch as jest.Mock).mock.calls[0][1].signal as AbortSignal;
  expect(firstSignal.aborted).toBe(true);
  expect((apiClient as any).inFlightGets.size).toBe(0);

  const second = await apiClient.get('/stalled', undefined, options);
  expect(second.data).toEqual({ lectures: [1] });
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('a GET attempt is aborted at 20 seconds even when the caller asks for 60', async () => {
  jest.useFakeTimers();
  (global.fetch as jest.Mock).mockImplementation(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
        );
      }),
  );

  const request = apiClient.get('/slow', undefined, { timeout: 60000, retry: false, useCache: false });
  const settled = request.catch((error) => error);
  await jest.advanceTimersByTimeAsync(0);
  const signal = (global.fetch as jest.Mock).mock.calls[0][1].signal as AbortSignal;

  await jest.advanceTimersByTimeAsync(19999);
  expect(signal.aborted).toBe(false);
  await jest.advanceTimersByTimeAsync(1);
  expect(signal.aborted).toBe(true);
  expect(await settled).toMatchObject({ isTimeout: true });
});

test('a GET makes at most 2 attempts, a POST keeps the configured 3', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

  await expect(apiClient.get('/down', undefined, { useCache: false })).rejects.toThrow();
  expect(global.fetch).toHaveBeenCalledTimes(2);

  (global.fetch as jest.Mock).mockClear();
  await expect(apiClient.post('/down', { a: 1 })).rejects.toThrow();
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
