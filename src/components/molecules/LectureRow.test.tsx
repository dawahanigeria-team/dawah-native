import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { LectureRow, lectureRowHeight } from './LectureRow';
import type { LectureRowModel } from './lectureRowModel';

jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../utils/imageUrl', () => ({
  imageUrlForSlot: (url: string, slot: string) => `${url}?slot=${slot}`,
}));
jest.mock('../../hooks/useTheme', () => {
  const { colorsLight } = jest.requireActual('../../theme/designTokens');
  return { useTheme: () => ({ colors: colorsLight }), useThemeColors: () => colorsLight };
});

const lecture: LectureRowModel = {
  id: 'l1',
  title: 'Tafsir Al-Fatiha',
  scholar: 'Sheikh Gumi',
  durationSec: 3723,
  meta: '1.2K plays',
  leading: { kind: 'artwork', url: 'https://media.example/a.jpg' },
};

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

const labels = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => typeof node.type === 'string' && typeof node.props.accessibilityLabel === 'string')
    .map((node) => node.props.accessibilityLabel as string);

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAll((node) => (node.type as unknown) === 'Text')
    .map((node) => [node.props.children].flat().join(''));

test('idle row reads title, scholar and spoken duration, and shows display-size artwork', () => {
  const tree = render(<LectureRow lecture={lecture} onPress={() => {}} />);
  expect(labels(tree)).toEqual(['Tafsir Al-Fatiha, Sheikh Gumi, 1 hour 2 minutes']);
  expect(texts(tree)).toEqual(['Tafsir Al-Fatiha', 'Sheikh Gumi • 1:02:03 • 1.2K plays']);
  expect(tree.root.findByType('ExpoImage' as never).props.source).toEqual({
    uri: 'https://media.example/a.jpg?slot=row',
  });
});

test('play and more buttons appear only when handlers are given and are also row accessibility actions', () => {
  const onPlay = jest.fn();
  const onMore = jest.fn();
  const tree = render(<LectureRow lecture={lecture} onPress={() => {}} onPlay={onPlay} onMore={onMore} />);
  expect(labels(tree)).toEqual([
    'Tafsir Al-Fatiha, Sheikh Gumi, 1 hour 2 minutes',
    'Play Tafsir Al-Fatiha',
    'More options for Tafsir Al-Fatiha',
  ]);
  const row = tree.root.find(
    (node) => typeof node.type === 'string' && node.props.accessibilityLabel?.startsWith('Tafsir'),
  );
  expect(row.props.accessibilityActions).toEqual([
    { name: 'play', label: 'Play' },
    { name: 'more', label: 'More options' },
  ]);
  act(() => row.props.onAccessibilityAction({ nativeEvent: { actionName: 'more' } }));
  expect(onMore.mock.calls).toEqual([[]]);
  expect(onPlay.mock.calls).toEqual([]);
});

test('playing numbered row swaps the number for an indicator and announces state and download', () => {
  const numbered: LectureRowModel = { ...lecture, leading: { kind: 'position', position: 4 } };
  const idle = render(<LectureRow lecture={numbered} onPress={() => {}} />);
  expect(texts(idle)[0]).toBe('4');

  const tree = render(
    <LectureRow
      lecture={numbered}
      playback="playing"
      download={{ status: 'downloading', progress: 0.456 }}
      onPress={() => {}}
    />,
  );
  expect(texts(tree)).toEqual(['Tafsir Al-Fatiha', 'Sheikh Gumi • 1:02:03 • 1.2K plays • 46%']);
  expect(labels(tree)).toEqual([
    'Tafsir Al-Fatiha, Sheikh Gumi, 1 hour 2 minutes, Now playing, Downloading 46%',
  ]);
  const icons = tree.root.findAll((node) => node.type === ('Ionicons' as never)).map((n) => n.props.name);
  expect(icons).toEqual(['musical-notes', 'arrow-down-circle-outline']);
});

test('missing artwork and unknown duration render a placeholder and omit duration', () => {
  const tree = render(
    <LectureRow
      lecture={{ ...lecture, durationSec: null, scholar: null, leading: { kind: 'artwork', url: null } }}
      download={{ status: 'downloaded' }}
      onPress={() => {}}
    />,
  );
  expect(tree.root.findAllByType('ExpoImage' as never)).toHaveLength(0);
  expect(labels(tree)).toEqual(['Tafsir Al-Fatiha, Downloaded']);
  expect(texts(tree)[1]).toBe('1.2K plays');
});

test('row height is fixed per font scale and capped at 2x', () => {
  expect(lectureRowHeight(1)).toBe(74);
  expect(lectureRowHeight(1.5)).toBe(102);
  expect(lectureRowHeight(3)).toBe(lectureRowHeight(2));
});

test('onLongPress fires from a long press and from the longpress accessibility action', () => {
  const onLongPress = jest.fn();
  const tree = render(<LectureRow lecture={lecture} onPress={() => {}} onLongPress={onLongPress} />);
  const row = tree.root.find((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
  expect(row.props.accessibilityActions).toEqual([{ name: 'longpress' }]);
  act(() => tree.root.find((n) => n.props.onLongPress === onLongPress).props.onLongPress());
  act(() => row.props.onAccessibilityAction({ nativeEvent: { actionName: 'longpress' } }));
  expect(onLongPress.mock.calls).toHaveLength(2);
});
