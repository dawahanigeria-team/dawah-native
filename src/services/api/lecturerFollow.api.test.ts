import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';
import { followLecturer, unfollowLecturer } from './lecturerFollow.api';

jest.mock('./base.api', () => ({
  apiClient: {
    post: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const mockPost = apiClient.post as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
});

test('followLecturer posts follow with default type', async () => {
  mockPost.mockResolvedValue({
    data: {
      success: true,
      data: {
        following: true,
        lecturerId: 456,
        lecturerType: 'rp',
        upserted: true,
      },
    },
  });

  const result = await followLecturer(456);

  expect(mockPost).toHaveBeenCalledWith(
    API_CONFIG.ENDPOINTS.LECTURER_FOLLOW,
    {
      lecturerId: 456,
      type: 'rp',
      action: 'follow',
    },
    expect.objectContaining({
      timeout: API_CONFIG.TIMEOUTS.DEFAULT,
      useCache: false,
    }),
  );

  expect(result).toEqual({
    success: true,
    data: {
      following: true,
      lecturerId: 456,
      lecturerType: 'rp',
      upserted: true,
    },
  });
});

test('unfollowLecturer posts unfollow with explicit type', async () => {
  mockPost.mockResolvedValue({
    data: {
      success: true,
      data: {
        following: false,
        lecturerId: 789,
        lecturerType: 'reciter',
        deleted: 1,
      },
    },
  });

  const result = await unfollowLecturer(789, 'reciter');

  expect(mockPost).toHaveBeenCalledWith(
    API_CONFIG.ENDPOINTS.LECTURER_FOLLOW,
    {
      lecturerId: 789,
      type: 'reciter',
      action: 'unfollow',
    },
    expect.objectContaining({
      timeout: API_CONFIG.TIMEOUTS.DEFAULT,
      useCache: false,
    }),
  );

  expect(result).toEqual({
    success: true,
    data: {
      following: false,
      lecturerId: 789,
      lecturerType: 'reciter',
      deleted: 1,
    },
  });
});

test('maps snake_case response fields to camelCase contract', async () => {
  mockPost.mockResolvedValue({
    data: {
      success: true,
      data: {
        following: true,
        lecturer_id: 654,
        lecturer_type: 'rp',
      },
    },
  });

  const result = await followLecturer(654);

  expect(result).toEqual({
    success: true,
    data: {
      following: true,
      lecturerId: 654,
      lecturerType: 'rp',
    },
  });
});

test('throws when API returns unsuccessful payload', async () => {
  mockPost.mockResolvedValue({
    data: {
      success: false,
      message: 'Invalid action',
    },
  });

  await expect(followLecturer(123)).rejects.toThrow('Invalid action');
});
