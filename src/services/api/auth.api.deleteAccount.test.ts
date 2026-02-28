import { authApi } from './auth.api';
import { ApiError } from './base.api';

const mockPost = jest.fn();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../storage/secureStoreCompat', () => ({
  secureStoreCompat: {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  },
}));

jest.mock('./base.api', () => {
  class MockApiError extends Error {
    statusCode?: number;
    data?: unknown;

    constructor(message: string, statusCode?: number, data?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.data = data;
    }
  }

  return {
    apiClient: {
      post: (...args: unknown[]) => mockPost(...args),
    },
    ApiError: MockApiError,
  };
});

describe('authApi.deleteAccount', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  test('uses the dedicated delete_account endpoint by default', async () => {
    mockPost.mockResolvedValue({
      data: { success: true },
    });

    await authApi.deleteAccount('123');

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/api/delete_account.php', {
      confirm: true,
      userId: 123,
    }, expect.objectContaining({
      timeout: expect.any(Number),
      useCache: false,
      retry: false,
    }));
  });

  test('falls back to user_auth delete_account action when endpoint is unavailable', async () => {
    mockPost
      .mockRejectedValueOnce(new ApiError('Not found', 404))
      .mockResolvedValueOnce({ data: { success: true } });

    await authApi.deleteAccount('123');

    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/delete_account.php', {
      confirm: true,
      userId: 123,
    }, expect.objectContaining({
      timeout: expect.any(Number),
      useCache: false,
      retry: false,
    }));
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/user_auth.php', {
      action: 'delete_account',
      confirm: true,
      userId: 123,
    }, expect.objectContaining({
      timeout: expect.any(Number),
      useCache: false,
      retry: false,
    }));
  });

  test('does not fallback for validation/auth errors', async () => {
    mockPost.mockRejectedValueOnce(new ApiError('Bad payload', 400));

    await expect(authApi.deleteAccount('123')).rejects.toThrow('Bad payload');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
