import { apiClient } from './base.api';
import { lectureDetailApi } from './lectureDetail.api';

jest.mock('./base.api', () => ({
  apiClient: {
    get: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    isCancelled = false;
  },
}));

const mockGet = apiClient.get as jest.Mock;

const load = async (description: string) => {
  mockGet.mockResolvedValue({
    data: [{ nid: 30000, Title: 'Tafseer Ramadan 1436 Day 15', description }],
  });
  const lecture = await lectureDetailApi.getLectureDetail({
    lectureId: 30000,
    useCache: false,
  });
  return lecture.description;
};

beforeEach(() => {
  mockGet.mockReset();
});

test('drops the legacy uploader language and MP3/AMR size lines', async () => {
  // leclistingapi.php?lecid=30000 on 2026-11-12. The AMR copies were not
  // carried over to R2, so the size line advertises a file that no longer exists.
  expect(
    await load('Language: Yoruba.\nSize: 9.71 MB [MP3]  | 3.88 MB [AMR]\n'),
  ).toBe('');
  expect(await load('Size: 1.66 MB [MP3]  | 327.82 KB [AMR]\n')).toBe('');
});

test('keeps a real description written around the generated lines', async () => {
  expect(
    await load(
      'A reminder on patience.\nLanguage: Hausa.\nSize: 8.55 MB [MP3]  | 1.42 MB [AMR]\n',
    ),
  ).toBe('A reminder on patience.');
});
