import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MiniPlayer } from './MiniPlayer';
import { playerStore } from '../../stores/playerStore';
import type { Episode } from '../../types/types';

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('expo-router', () => ({ usePathname: () => '/library', useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../stores/playerStore', () => ({
  playerStore: jest.requireActual('simpler-state').entity({ currentEpisode: null, isPlaying: false, isLoading: false, duration: 0 }),
  resolveEpisodeArtistName: () => 'Scholar',
  usePlayerActions: () => ({ togglePlayPause: jest.fn(), closePlayer: jest.fn(), setProgress: jest.fn() }),
}));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: jest.requireActual('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const episode = (id: string, coverUrl: string): Episode => ({
  id,
  title: `Lecture ${id}`,
  durationSec: 60,
  coverUrl,
  audioUrl: `https://media.dawahnigeria.com/${id}.mp3`,
  seriesId: '',
  plays: 0,
  liked: false,
  language: 'Arabic',
  downloads: 0,
  createdAt: '2026-11-19T00:00:00.000Z',
});

const images = (root: TestRenderer.ReactTestRenderer) => root.root.findAll((n) => (n.type as unknown) === 'ExpoImage');

test('a broken cover does not hide the next episode cover, and the old picture is not reused', () => {
  let root!: TestRenderer.ReactTestRenderer;
  act(() => {
    playerStore.set({ ...playerStore.get(), currentEpisode: episode('1', 'https://media.dawahnigeria.com/dc_images/thumbnails/1.jpg') });
  });
  act(() => {
    root = TestRenderer.create(<MiniPlayer />);
  });
  expect(images(root)[0].props.source).toEqual({ uri: 'https://media.dawahnigeria.com/dc_images/1.jpg' });

  act(() => images(root)[0].props.onError());
  expect(images(root)).toHaveLength(0);

  act(() => {
    playerStore.set({ ...playerStore.get(), currentEpisode: episode('2', 'https://media.dawahnigeria.com/dc_images/thumbnails/2.jpg') });
  });
  const [next] = images(root);
  expect(next.props.source).toEqual({ uri: 'https://media.dawahnigeria.com/dc_images/2.jpg' });
  expect(next.props.recyclingKey).toBe('2');
});
