import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';
import { followLecturer, unfollowLecturer } from './lecturerFollow.api';
import { userService } from '../user.service';

jest.mock('./base.api', () => ({
  apiClient: {
    post: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

jest.mock('../user.service', () => ({
  userService: {
    getUserId: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;
const mockGetUserId = userService.getUserId as jest.Mock;

beforeEach(() => {
  mockPost.mockReset();
  mockGetUserId.mockReset();
});

test('followLecturer posts follow with default type', async () => {
  mockGetUserId.mockResolvedValue('guest_123');
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
      user_id: 'guest_123',
      lecturer_id: '456',
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
  mockGetUserId.mockResolvedValue('guest_456');
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
      user_id: 'guest_456',
      lecturer_id: '789',
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
