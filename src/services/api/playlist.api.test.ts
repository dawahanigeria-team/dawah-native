import { apiClient } from './base.api';
import { playlistApi } from './playlist.api';

jest.mock('./base.api', () => ({
  apiClient: { get: jest.fn() },
  ApiError: class ApiError extends Error {},
}));
jest.mock('../user.service', () => ({
  userService: { getUserId: jest.fn().mockResolvedValue('91554') },
}));
jest.mock('../config/sentry.config', () => ({
  addSentryBreadcrumb: jest.fn(),
  captureSentryException: jest.fn(),
}));

const mockGet = apiClient.get as jest.Mock;

test('counts each playlist from its lecture ids, since the API sends no count', async () => {
  mockGet.mockResolvedValue({
    data: {
      success: true,
      message: 'Playlists retrieved successfully',
      data: [
        { id: 162982, name: 'Kaizen', user_id: 91554, is_private: 0, audio: [138702] },
        { id: 42, name: 'My lecture', user_id: 91554, is_private: 0, audio: [] },
        { id: 7, name: 'Old', user_id: 91554, is_private: 1 },
      ],
    },
  });

  const { playlists } = await playlistApi.getUserPlaylists();

  expect(playlists.map((p) => [p.name, p.count])).toEqual([
    ['Kaizen', 1],
    ['My lecture', 0],
    ['Old', 0],
  ]);
});
