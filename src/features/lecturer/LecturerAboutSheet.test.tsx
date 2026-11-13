import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { LecturerAboutSheet } from './LecturerAboutSheet';
import { buildLecturerAbout } from './lecturerAbout';

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../hooks/useTheme', () => {
  const { colorsDark } = jest.requireActual('../../theme/designTokens');
  return { useTheme: () => ({ colors: colorsDark }), useThemeColors: () => colorsDark };
});

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(element);
  });
  return tree;
};

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat().join(''));

test('shows the full name, the late-scholar line, origin and facts', () => {
  const about = buildLecturerAbout(
    { name: 'Shaykh Rasheed Buwayb (Iwo)- [RahimahuLlah]', language: 'Yoruba', total_audio: 212 },
    { updated_date: 'Sat, 2026/10/24 - 19:22' },
  );
  const tree = render(<LecturerAboutSheet about={about} visible onClose={() => {}} />);

  expect(texts(tree)).toEqual([
    'Shaykh Rasheed Buwayb (Iwo)- [RahimahuLlah]',
    'Late scholar, may Allah have mercy on him',
    'Iwo · Yoruba',
    '212 lectures',
    'Latest upload Oct 24, 2026',
    'Close',
  ]);
});

test('leaves out the late-scholar line and origin when there is no data for them', () => {
  const tree = render(
    <LecturerAboutSheet about={buildLecturerAbout({ name: 'Shaykh Rajab' })} visible onClose={() => {}} />,
  );

  expect(texts(tree)).toEqual(['Shaykh Rajab', 'Close']);
});

test('Close calls onClose', () => {
  const onClose = jest.fn();
  const tree = render(
    <LecturerAboutSheet about={buildLecturerAbout({ name: 'Shaykh Rajab' })} visible onClose={onClose} />,
  );
  const close = tree.root.find((node) => node.props.accessibilityRole === 'button' && node.props.onPress);

  act(() => close.props.onPress());

  expect(onClose).toHaveBeenCalledTimes(1);
});
