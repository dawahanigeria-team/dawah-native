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
  // rplisting_multi_nid_api.php returns a bare array keyed by `nid`, not `id`.
  mockGet.mockResolvedValue({
    data: [{ nid: 42, name: 'Test Scholar', lang_id: 1 }],
  });

  const lecturer = await lecturersApi.getLecturerDetails(42);

  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledWith(
    '/api/rplisting_multi_nid_api.php',
    { id: 42 },
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
