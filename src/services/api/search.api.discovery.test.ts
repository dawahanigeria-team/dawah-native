import { apiClient } from './base.api';
import { searchApi } from './search.api';

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

test('fetches lecturer and album discovery sections in parallel', async () => {
  mockGet
    .mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'Scholar' }], total: 3 } })
    .mockResolvedValueOnce({ data: { data: [{ id: 2, title: 'Album' }], total: 4 } });

  const result = await searchApi.searchDiscovery('scholar');

  expect(mockGet).toHaveBeenCalledTimes(2);
  expect(mockGet).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('searchApi.php'),
    expect.objectContaining({ type: 'lecturers', value: 'scholar', page: 1, limit: 50 }),
    expect.anything(),
  );
  expect(mockGet).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('searchApi.php'),
    expect.objectContaining({ type: 'albums', value: 'scholar', page: 1, limit: 50 }),
    expect.anything(),
  );
  expect(result).toEqual({
    lecturers: [{ id: 1, name: 'Scholar' }],
    lecturerTotal: 3,
    albums: [{ id: 2, title: 'Album' }],
    albumTotal: 4,
  });
});

test('keeps available discovery results when one section fails', async () => {
  mockGet
    .mockRejectedValueOnce(new Error('lecturer search unavailable'))
    .mockResolvedValueOnce({ data: { data: [{ id: 2, title: 'Album' }], total: 1 } });

  await expect(searchApi.searchDiscovery('album')).resolves.toEqual({
    lecturers: [],
    lecturerTotal: 0,
    albums: [{ id: 2, title: 'Album' }],
    albumTotal: 1,
  });
});
