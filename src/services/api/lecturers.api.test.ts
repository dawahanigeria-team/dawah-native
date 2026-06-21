import { API_CONFIG } from '../config/api.config';
import { apiClient } from './base.api';
import { lecturersApi } from './lecturers.api';

jest.mock('./base.api', () => ({
  apiClient: {
    get: jest.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const mockGet = apiClient.get as jest.Mock;

beforeEach(() => {
  mockGet.mockReset();
});

test('loads lecturer details through the exact resource-person lookup without requesting lectures', async () => {
  mockGet.mockResolvedValue({
    data: [
      {
        id: 41063,
        name: 'Shaykh Qamarudeen Yunus (Abeokuta)',
        img: 'https://example.test/qamarudeen.jpg',
        lang_id: 7,
      },
    ],
  });

  const lecturer = await lecturersApi.getLecturerDetails(41063);

  expect(lecturer).toMatchObject({
    id: 41063,
    name: 'Shaykh Qamarudeen Yunus (Abeokuta)',
  });
  expect(mockGet).toHaveBeenCalledWith(
    '/api/all_rps_api.php',
    { rpid: 41063 },
    expect.objectContaining({
      timeout: API_CONFIG.TIMEOUTS.DEFAULT,
      useCache: true,
    }),
  );
  expect(mockGet).toHaveBeenCalledTimes(1);
});
