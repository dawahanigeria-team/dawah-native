import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ScreenHeader } from './ScreenHeader';

const mockBackOrHome = jest.fn();
jest.mock('../../navigation/useBackOrHome', () => ({ useBackOrHome: () => mockBackOrHome }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../hooks/useTheme', () => {
  const { colorsDark } = jest.requireActual('../../theme/designTokens');
  return { useTheme: () => ({ colors: colorsDark }), useThemeColors: () => colorsDark };
});

beforeEach(() => mockBackOrHome.mockClear());

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

const buttons = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => typeof node.type === 'string' && node.props.accessibilityRole === 'button');

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat().join(''));

test('inline header: Go back falls back to back-or-home, title and subtitle render, header role set', () => {
  const tree = render(<ScreenHeader title="Inbox" subtitle="3 unread" />);
  expect(buttons(tree).map((b) => b.props.accessibilityLabel)).toEqual(['Go back']);
  expect(texts(tree)).toEqual(['Inbox', '3 unread']);
  expect(tree.root.find((n) => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header').props.children).toBe('Inbox');
  const backButton = tree.root.find((n) => n.props.accessibilityLabel === 'Go back' && n.props.onPress);
  act(() => backButton.props.onPress());
  expect(mockBackOrHome.mock.calls).toHaveLength(1);
});

test('a custom onBack replaces the default and actions render with badges read aloud', () => {
  const onBack = jest.fn();
  const onSettings = jest.fn();
  const tree = render(
    <ScreenHeader
      title="Inbox"
      onBack={onBack}
      actions={[
        { icon: 'settings-outline', accessibilityLabel: 'Notification settings', onPress: onSettings, badge: 120 },
        { icon: 'share-outline', accessibilityLabel: 'Share', onPress: () => {}, badge: true },
      ]}
    />,
  );
  expect(buttons(tree).map((b) => b.props.accessibilityLabel)).toEqual([
    'Go back',
    'Notification settings, 120 new',
    'Share',
  ]);
  expect(texts(tree)).toEqual(['Inbox', '99+']);
  act(() => tree.root.find((n) => n.props.accessibilityLabel === 'Go back' && n.props.onPress).props.onPress());
  expect(onBack.mock.calls).toHaveLength(1);
  expect(mockBackOrHome.mock.calls).toHaveLength(0);
});

test('large header for tab roots has no back button and uses the large title style', () => {
  const tree = render(
    <ScreenHeader
      variant="large"
      title="Library"
      actions={[{ icon: 'search', accessibilityLabel: 'Search library', onPress: () => {} }]}
    />,
  );
  expect(buttons(tree).map((b) => b.props.accessibilityLabel)).toEqual(['Search library']);
  const title = tree.root.find((n) => (n.type as unknown) === 'Text' && n.props.accessibilityRole === 'header');
  expect(title.props.children).toBe('Library');
  expect(title.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontSize: 34 })]));
});

test('overlay header floats over artwork with white icons on a scrim and respects the top inset', () => {
  const tree = render(
    <ScreenHeader variant="overlay" actions={[{ icon: 'share-social', accessibilityLabel: 'Share album', onPress: () => {} }]} />,
  );
  expect(buttons(tree).map((b) => b.props.accessibilityLabel)).toEqual(['Go back', 'Share album']);
  expect(texts(tree)).toEqual([]);
  const icons = tree.root.findAll((n) => n.type === ('Ionicons' as never));
  expect(icons.map((i) => i.props.color)).toEqual(['#FFFFFF', '#FFFFFF']);
  const container = tree.root.findAll((n) => (n.type as unknown) === 'View')[0];
  expect(container.props.style).toEqual(
    expect.arrayContaining([{ paddingTop: 47 }, expect.objectContaining({ position: 'absolute' })]),
  );
});
