import { durationToSeconds, getSurahNumber, sortRecitationsInQuranOrder } from './quran';

test('extracts common Quran track number formats', () => {
  expect(getSurahNumber('Q114 - An-Nas')).toBe(114);
  expect(getSurahNumber('Surah 002 - Al-Baqarah')).toBe(2);
  expect(getSurahNumber('001. Al-Fatihah')).toBe(1);
  expect(getSurahNumber('A general reminder')).toBeUndefined();
});

test('sorts recitations from Al-Fatihah to An-Nas', () => {
  const sorted = sortRecitationsInQuranOrder([
    { id: '114', title: 'Q114 - An-Nas', duration: '1:00', audioUrl: '114.mp3' },
    { id: '1', title: 'Q001 - Al-Fatihah', duration: '1:00', audioUrl: '1.mp3' },
    { id: '2', title: 'Q002 - Al-Baqarah', duration: '1:00', audioUrl: '2.mp3' },
  ]);
  expect(sorted.map((item) => item.id)).toEqual(['1', '2', '114']);
  expect(sorted.map((item) => item.trackNumber)).toEqual([1, 2, 3]);
});

test('normalizes clock durations for the player', () => {
  expect(durationToSeconds('04:30')).toBe(270);
  expect(durationToSeconds('1:02:03')).toBe(3723);
  expect(durationToSeconds('95')).toBe(95);
});
