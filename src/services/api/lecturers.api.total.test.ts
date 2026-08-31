import { lecturersApi } from './lecturers.api';
import { apiClient } from './base.api';

jest.mock('./base.api', () => ({
  apiClient: { get: jest.fn() },
  ApiError: class ApiError extends Error {},
}));

const mockGet = (apiClient as unknown as { get: jest.Mock }).get;

beforeEach(() => {
  mockGet.mockReset();
});

// The screen shows "Showing 20 of 324 scholars" and decides whether to keep
// paginating from this number. Before the fix the API sent the total only as a
// response header, which the client's cache drops, so `total` silently became
// the page length and the catalogue looked 20 items long.
test('total comes from the envelope, not the number of rows on the page', async () => {
  mockGet.mockResolvedValue({
    data: {
      success: true,
      data: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Scholar ${i}` })),
      total: 324,
      page: 1,
      per_page: 20,
      total_pages: 17,
      has_more: true,
    },
  });

  const response = await lecturersApi.getAllLecturers({ page: 1, lim: 20 });

  expect(response.data).toHaveLength(20);
  expect(response.total).toBe(324);
  expect(response.total_pages).toBe(17);
});

// An older API (or an unexpected shape) sends a bare array with no total. The
// client must not invent one; falling back to the page length is the honest
// answer and makes the screen behave as it did before.
test('falls back to the page length when the upstream sends a bare array', async () => {
  mockGet.mockResolvedValue({
    data: [{ id: 1, name: 'Only Scholar' }],
  });

  const response = await lecturersApi.getAllLecturers({ page: 1, lim: 20 });

  expect(response.data).toHaveLength(1);
  expect(response.total).toBe(1);
});
