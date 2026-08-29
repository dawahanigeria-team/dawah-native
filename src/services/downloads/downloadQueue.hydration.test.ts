import type { QueuedDownload } from './downloadQueue.service';

/**
 * The queue is restored from storage asynchronously, but the triggers that
 * start it - the initial NetInfo.fetch, and an auth transition - do not wait
 * for that read. Whichever wins, a pass that runs first sees an empty Map,
 * concludes there is nothing to do, and the items restored a moment later sit
 * at QUEUED with nothing left to start them.
 */

let releaseStoredQueue: (value: string | null) => void;
const storedQueueRead = new Promise<string | null>(resolve => {
  releaseStoredQueue = resolve;
});

const mockGetItem = jest.fn(() => storedQueueRead);
const mockCreateDownload = jest.fn();
const mockStartDownload = jest.fn().mockResolvedValue('completed');

jest.mock('expo-sqlite/kv-store', () => ({
  getItem: (...args: unknown[]) => (mockGetItem as any)(...args),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockNetInfoFetch = jest.fn().mockResolvedValue({ isConnected: true, type: 'wifi' });

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: (...args: unknown[]) => (mockNetInfoFetch as any)(...args),
  },
}));

jest.mock('../downloads.service', () => ({
  downloadsService: {
    isDownloaded: jest.fn(() => false),
    createDownload: (...args: unknown[]) => (mockCreateDownload as any)(...args),
    startDownload: (...args: unknown[]) => (mockStartDownload as any)(...args),
  },
}));

jest.mock('../api/downloads.api', () => ({
  DownloadAuthRequiredError: class extends Error {},
  DownloadLimitReachedError: class extends Error {},
}));

let authChangeCallback: ((isAuthenticated: boolean) => void) | undefined;

jest.mock('../../stores/authStore', () => ({
  authStore: { get: () => ({ isAuthenticated: true }) },
  subscribeToAuthChange: (cb: (isAuthenticated: boolean) => void) => {
    authChangeCallback = cb;
    return jest.fn();
  },
}));

jest.mock('../config/sentry.config', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureSentryException: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const persisted: QueuedDownload = {
  id: 'lecture-1',
  episode: { id: 'lecture-1', title: 'Restored lecture' } as never,
  status: 'queued' as QueuedDownload['status'],
  progress: 0,
  bytesDownloaded: 0,
  totalBytes: 0,
  speed: 0,
  addedAt: Date.now(),
  priority: 0,
};

/** Let every already-resolved promise in the chain run to completion. */
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

test('a queue pass that beats the storage read still starts the restored items', async () => {
  mockCreateDownload.mockResolvedValue({ id: 'lecture-1' });

  // Importing constructs the singleton, which registers the triggers and kicks
  // off the storage read. The read is still pending at this point.
  require('./downloadQueue.service');
  await settle();

  // The NetInfo-driven pass has already run against an empty queue.
  expect(mockCreateDownload).not.toHaveBeenCalled();

  releaseStoredQueue(JSON.stringify([persisted]));
  await settle();

  expect(mockCreateDownload).toHaveBeenCalledTimes(1);
  expect(mockCreateDownload.mock.calls[0][0]).toMatchObject({ id: 'lecture-1' });
});

/**
 * autoStart is the app's switch for "start queued downloads without being
 * asked". Signing in is not a request to download - it only removes the reason
 * we were refusing to - so the same switch has to govern this trigger, as it
 * already governs addToQueue and the network-change handler.
 *
 * Nothing sets autoStart to false today (updateConfig has no callers), so this
 * pins a guard that is currently unreachable in the app.
 *
 * NetInfo.fetch is the first thing processQueue does after the hydration and
 * auth checks, which makes it a reliable witness for "did a pass actually run".
 */
test('signing in respects autoStart', async () => {
  const { downloadQueueService } = require('./downloadQueue.service');
  expect(authChangeCallback).toBeDefined();

  downloadQueueService.updateConfig({ autoStart: false });
  await settle();
  mockNetInfoFetch.mockClear();

  authChangeCallback!(true);
  await settle();
  expect(mockNetInfoFetch).not.toHaveBeenCalled();

  downloadQueueService.updateConfig({ autoStart: true });
  await settle();
  mockNetInfoFetch.mockClear();

  authChangeCallback!(true);
  await settle();
  expect(mockNetInfoFetch).toHaveBeenCalled();
});
