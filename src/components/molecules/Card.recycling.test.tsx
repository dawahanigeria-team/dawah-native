import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image } from 'expo-image';
import { Card } from './Card';
import type { Episode } from '../../types/types';

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('../../stores', () => ({ usePlayerActions: () => ({ playEpisode: jest.fn() }) }));
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ colors: require('../../theme/designTokens').colorsLight }),
}));
jest.mock('../atoms/Text', () => ({ Text: 'Text' }));
jest.mock('../atoms/Icon', () => ({ Icon: 'Icon' }));
jest.mock('../atoms/Badge', () => ({ Badge: 'Badge' }));
jest.mock('../atoms/Touchable', () => ({ Touchable: 'Touchable' }));
jest.mock('../../utils/imageUrl', () => ({ imageUrlForSlot: (url: string) => url }));

const episode = (id: string): Episode => ({
  id, title: id, coverUrl: `https://example.test/${id}.jpg`, audioUrl: 'audio',
  durationSec: 10, seriesId: '', plays: 0, liked: false,
} as Episode);

test('a recycled card renders new artwork after the previous image failed', async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => { tree = renderer.create(<Card variant="square" data={episode('one')} />); });
  const lateError = tree.root.findByType(Image).props.onError;
  await act(async () => { lateError(); });
  expect(tree.root.findAllByType(Image)).toHaveLength(0);
  await act(async () => { tree.update(<Card variant="square" data={episode('two')} />); });
  expect(tree.root.findByType(Image).props.source.uri).toBe('https://example.test/two.jpg');
  // A delayed event for an old image must not hide the newly recycled item.
  await act(async () => { lateError(); });
  expect(tree.root.findByType(Image).props.source.uri).toBe('https://example.test/two.jpg');
  await act(async () => { tree.unmount(); });
});
