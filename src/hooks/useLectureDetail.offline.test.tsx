import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useLectureDetail, type UseLectureDetailResult } from './useLectureDetail';
import { lectureDetailApi } from '../services/api/lectureDetail.api';
import { downloadsService } from '../services/downloads.service';

jest.mock('../services/api/lectureDetail.api', () => ({
  lectureDetailApi: { getLectureDetail: jest.fn(), clearCache: jest.fn() },
}));
jest.mock('../services/downloads.service', () => ({
  downloadsService: {
    ensureInitialized: jest.fn(async () => undefined),
    isDownloaded: jest.fn(),
    getDownloadMetadata: jest.fn(),
  },
}));

const offline = new Error('No internet connection. Please check your network and try again.');

const render = async (id: string) => {
  let result!: UseLectureDetailResult;
  const Probe = () => {
    result = useLectureDetail(id);
    return null;
  };
  await act(async () => {
    TestRenderer.create(<Probe />);
  });
  return () => result;
};

beforeEach(() => {
  jest.mocked(lectureDetailApi.getLectureDetail).mockRejectedValue(offline);
});

test('a downloaded lecture opens from its saved metadata when the request fails', async () => {
  jest.mocked(downloadsService.isDownloaded).mockReturnValue(true);
  jest.mocked(downloadsService.getDownloadMetadata).mockReturnValue({
    lectureId: '338510',
    title: 'Lecture-The Concept of Hope 04',
    lecturerName: "Ustadh Sa'eed Hamzah (Lagos)",
    coverUrl: 'https://media.dawahnigeria.com/dc_images/1.jpg',
    audioUrl: 'https://media.dawahnigeria.com/hope04.mp3',
    duration: 8633,
    downloadedAt: '2026-11-25T08:00:00.000Z',
  });

  const result = await render('338510');

  expect(result().error).toBeNull();
  expect(result().lecture).toMatchObject({
    id: '338510',
    title: 'Lecture-The Concept of Hope 04',
    lecturerName: "Ustadh Sa'eed Hamzah (Lagos)",
    audioUrl: 'https://media.dawahnigeria.com/hope04.mp3',
    durationSec: 8633,
    fromDownload: true,
  });
});

test('a download saved without an audio URL is still playable', async () => {
  jest.mocked(downloadsService.isDownloaded).mockReturnValue(true);
  jest.mocked(downloadsService.getDownloadMetadata).mockReturnValue({
    lectureId: '253432',
    title: 'Concept of Funeral rights 1a',
    lecturerName: "Ustadh Sa'eed Hamzah (Lagos)",
    duration: 300,
    downloadedAt: '2026-11-25T09:40:00.000Z',
  });

  const result = await render('253432');

  expect(result().lecture?.audioUrl).toBe('offline');
});

test('a lecture that is not downloaded still shows the request error', async () => {
  jest.mocked(downloadsService.isDownloaded).mockReturnValue(false);

  const result = await render('1');

  expect(result().lecture).toBeNull();
  expect(result().error).toBe('No internet connection. Please check your network and try again.');
});
