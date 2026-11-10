import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { historyService } from '../services/history.service';
import { type ContinueListeningItem, useContinueListening } from './useContinueListening';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(effect, [effect]);
  },
}));

jest.mock('../services/history.service', () => ({
  historyService: { getHistory: jest.fn() },
}));

const historyAt = (progress: number) => [
  {
    lectureId: 'A',
    title: 'Lecture A',
    lecturerName: 'Ustadh',
    coverUrl: '',
    audioUrl: 'https://example.com/a.mp3',
    duration: 3000,
    playedAt: '2026-11-09T10:00:00.000Z',
    progress,
    language: 'English',
  },
];

let latest: ContinueListeningItem | null = null;
const record = (item: ContinueListeningItem | null) => {
  latest = item;
};
const Probe = ({ currentLectureId }: { currentLectureId?: string }) => {
  record(useContinueListening(currentLectureId));
  return null;
};

test('closing the player shows where the lecture was left, not where Home last read it', async () => {
  (historyService.getHistory as jest.Mock).mockResolvedValueOnce(historyAt(100));
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe currentLectureId="A" />);
  });
  expect(latest).toBeNull();

  (historyService.getHistory as jest.Mock).mockResolvedValueOnce(historyAt(1300));
  await act(async () => {
    tree.update(<Probe currentLectureId={undefined} />);
  });

  expect(latest?.positionSec).toBe(1300);
});
