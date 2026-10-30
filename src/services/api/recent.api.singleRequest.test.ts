import { recentApi } from './recent.api';

const mockGet = jest.fn();

jest.mock('./base.api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    clearCache: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));
jest.mock('../config/api.config', () => ({
  API_CONFIG: { ORIGIN: 'o', REFERER: 'r', USER_AGENT: 'u', X_PROJECT_KEY: 'k' },
}));
jest.mock('@/utils/logger', () => ({ logger: { debug: jest.fn() } }));

const row = (n: number, extra: Record<string, unknown> = {}) => ({
  nid: n,
  mp3_title: `Lecture ${n}`,
  mp3_url: `https://media.test/${n}.mp3`,
  updated_date: `Tue, 2026/10/${String(30 - Math.floor(n / 10)).padStart(2, '0')} - 10:00`,
  views: String(n),
  ...extra,
});
const serverRows = Array.from({ length: 150 }, (_, i) =>
  i === 3 ? row(150 - i, { keyword: 'dn_quran' }) : row(150 - i),
);

beforeEach(() => {
  jest.clearAllMocks();
  recentApi.clearCache();
  mockGet.mockResolvedValue({ data: { data: serverRows } });
});

test('Home recent list and trending share one limit=150 request', async () => {
  const [recent, trending] = await Promise.all([
    recentApi.getRecentLectures({ page: 1, limit: 10 }),
    recentApi.getTrendingLectures({ page: 1, limit: 20 }),
  ]);

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet.mock.calls[0][1]).toMatchObject({ action: 'get_recent_audio', page: 1, limit: 150 });
  expect(recent.data.map((l: any) => l.nid)).toEqual([150, 149, 148, 146, 145, 144, 143, 142, 141, 140]);
  expect(trending.data).toHaveLength(20);
});

test('the short list is the first 30 server rows minus quran, as a limit=30 request returned', async () => {
  const response = await recentApi.getRecentLectures({ page: 1, limit: 30 });
  expect(response.total).toBe(29);
  expect(response.data[28]).toMatchObject({ nid: 121, Title: 'Lecture 121' });
});

test('a limit above 30 still reads the deduped pool', async () => {
  const response = await recentApi.getRecentLectures({ page: 1, limit: 100 });
  expect(response.total).toBe(149);
  expect(mockGet).toHaveBeenCalledTimes(1);
});
