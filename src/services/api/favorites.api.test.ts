import { favoritesApi } from './favorites.api';

const mockGetItem = jest.fn<Promise<string | null>, [string]>();
const mockSetItem = jest.fn<Promise<void>, [string, string]>();
const mockRemoveItem = jest.fn<Promise<void>, [string]>();

const mockGet = jest.fn();
const mockPost = jest.fn();

const mockGetUserId = jest.fn<Promise<string>, []>();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: (...args: [string]) => mockGetItem(...args),
    setItem: (...args: [string, string]) => mockSetItem(...args),
    removeItem: (...args: [string]) => mockRemoveItem(...args),
  },
}));

jest.mock('./base.api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  ApiError: class ApiError extends Error {
    statusCode?: number;
    isNetworkError?: boolean;
    constructor(message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

jest.mock('../user.service', () => ({
  userService: {
    getUserId: () => mockGetUserId(),
    clearUserId: jest.fn(),
  },
}));

jest.mock('../config/sentry.config', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureSentryException: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe('favoritesApi guest mode', () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
    mockGet.mockReset();
    mockPost.mockReset();
    mockGetUserId.mockReset();
  });

  test('getFavoriteIds returns cached IDs for guest users without API request', async () => {
    mockGetUserId.mockResolvedValue('guest_123-test');
    mockGetItem.mockResolvedValue(JSON.stringify(['11', '22']));

    const ids = await favoritesApi.getFavoriteIds('audio');

    expect(ids).toEqual(['11', '22']);
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('toggleFavorite updates cache and skips API for guest users', async () => {
    mockGetUserId.mockResolvedValue('guest_123-test');
    mockGetItem.mockResolvedValue(JSON.stringify([]));
    mockSetItem.mockResolvedValue();

    const result = await favoritesApi.toggleFavorite('99', 'audio');

    expect(mockSetItem).toHaveBeenCalledWith('favorites_cache', JSON.stringify(['99']));
    expect(mockPost).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      message: 'audio added to favorites (guest mode)',
    });
  });
});
