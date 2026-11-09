import { usesDisplayFace } from './Text';

jest.mock('../../hooks/useTheme', () => ({ useThemeColors: jest.fn() }));

test('titles use the display face', () => {
  expect(usesDisplayFace('title1', 'Tafsir Surah Yusuf')).toBe(true);
});

test('body text stays in the system font', () => {
  expect(usesDisplayFace('body', 'Tafsir Surah Yusuf')).toBe(false);
});

test.each(['Ƙaunar Annabi', 'Ɗan Adam', 'Ṣiṣe rere'])(
  'a title with letters the face lacks stays in the system font: %s',
  (title) => {
    expect(usesDisplayFace('title2', title)).toBe(false);
  },
);

test('Yoruba letters the face has keep the display face', () => {
  expect(usesDisplayFace('title2', 'Ẹtọ awọn obi')).toBe(true);
});
