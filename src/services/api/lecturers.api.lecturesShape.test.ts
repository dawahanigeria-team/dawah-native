import { apiClient } from './base.api';
import { lecturersApi } from './lecturers.api';

jest.mock('./base.api', () => ({
  apiClient: {
    get: jest.fn(),
    clearCache: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    isCancelled = false;
  },
}));

const mockGet = apiClient.get as jest.Mock;
const mockClearCache = apiClient.clearCache as jest.Mock;

beforeEach(() => {
  mockGet.mockReset();
  mockClearCache.mockReset();
});

test('returns the lectures upstream sent', async () => {
  mockGet.mockResolvedValue({ data: [{ nid: 1 }, { nid: 2 }] });

  const result = await lecturersApi.getLecturesByLecturer(5, 1);

  expect(result.data).toHaveLength(2);
  expect(mockClearCache).not.toHaveBeenCalled();
});

test('reports a genuinely empty list as empty, not as a failure', async () => {
  mockGet.mockResolvedValue({ data: [] });

  await expect(lecturersApi.getLecturesByLecturer(5, 1)).resolves.toEqual(
    expect.objectContaining({ data: [] }),
  );
  // An empty list is a valid answer, so it must stay cached — dropping it here
  // would send every lecturer with no lectures back to the network each visit.
  expect(mockClearCache).not.toHaveBeenCalled();
});

// The screen renders an empty list as "No lectures found for this scholar", so
// coercing an unreadable body to [] told the user the scholar has no lectures
// when the request had actually failed.
test.each([
  ['an error envelope', { success: false, message: 'boom' }],
  ['null', null],
  ['a bare string', 'Internal Server Error'],
])('throws when upstream sends %s instead of a list', async (_label: string, body: unknown) => {
  mockGet.mockResolvedValue({ data: body });

  await expect(lecturersApi.getLecturesByLecturer(5, 1)).rejects.toThrow();
});

// Cache writes are not gated on `useCache`, so the unreadable body is already
// in AsyncStorage; without this the retry button replays it for the whole TTL.
test('drops the cached copy so a retry can reach the network', async () => {
  mockGet.mockResolvedValue({ data: { success: false } });

  await expect(lecturersApi.getLecturesByLecturer(7, 2)).rejects.toThrow();

  expect(mockClearCache).toHaveBeenCalledWith(
    'leclisting_rp.php?page=2&rpid=7',
  );
});
