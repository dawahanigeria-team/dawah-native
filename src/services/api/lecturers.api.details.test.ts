import { apiClient } from './base.api';
import { lecturersApi } from './lecturers.api';

jest.mock('./base.api', () => ({
  apiClient: {
    get: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    isCancelled = false;
  },
}));

const mockGet = apiClient.get as jest.Mock;

beforeEach(() => {
  mockGet.mockReset();
});

test('loads lecturer details through the exact lecturer endpoint', async () => {
  mockGet.mockResolvedValue({
    data: [{ id: 42, name: 'Test Scholar', lang_id: 1 }],
  });

  const lecturer = await lecturersApi.getLecturerDetails(42);

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledWith(
    '/api/all_rps_api.php',
    { page: 1, lim: 1, offset: 0, meta: 1, rpid: 42 },
    expect.objectContaining({ useCache: true }),
  );
  expect(mockGet).not.toHaveBeenCalledWith(
    '/api/leclisting_rp.php',
    expect.anything(),
    expect.anything(),
  );
  expect(lecturer).toEqual(expect.objectContaining({ id: 42, name: 'Test Scholar' }));
});

test('returns null when the exact lecturer lookup has no result', async () => {
  mockGet.mockResolvedValue({ data: [] });

  await expect(lecturersApi.getLecturerDetails('missing')).resolves.toBeNull();
});
