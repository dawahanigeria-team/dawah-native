import type { SearchLecture } from '../../types/api.types';
import type { Episode } from '../../types/types';
import {
  albumTrackToRow,
  compactCount,
  episodeToRow,
  formatClock,
  lecturerLectureToRow,
  parseClockDuration,
  quranRecitationToRow,
  searchLectureToRow,
  spokenDuration,
} from './lectureRowModel';

test('parseClockDuration reads HH:MM:SS, MM:SS, bare seconds and rejects zero or junk', () => {
  expect(parseClockDuration('01:02:03')).toBe(3723);
  expect(parseClockDuration('12:34')).toBe(754);
  expect(parseClockDuration('90')).toBe(90);
  expect(parseClockDuration('00:00')).toBeNull();
  expect(parseClockDuration('abc')).toBeNull();
  expect(parseClockDuration(undefined)).toBeNull();
});

test('formatters produce visible and spoken durations', () => {
  expect(formatClock(3723)).toBe('1:02:03');
  expect(formatClock(754)).toBe('12:34');
  expect(spokenDuration(3723)).toBe('1 hour 2 minutes');
  expect(spokenDuration(60)).toBe('1 minute');
  expect(spokenDuration(45)).toBe('45 seconds');
  expect(compactCount(1234)).toBe('1.2K');
  expect(compactCount(2_000_000)).toBe('2M');
  expect(compactCount(999)).toBe('999');
});

test('episodeToRow maps the app Episode shape', () => {
  const episode = {
    id: 'e1',
    title: 'Tafsir Al-Fatiha',
    durationSec: 1800,
    coverUrl: 'https://media.example/c.jpg',
    lecturerName: '',
    rpname: 'Sheikh Ja\'afar',
    language: 'Hausa',
  } as Episode;
  expect(episodeToRow(episode, { position: 3 })).toEqual({
    id: 'e1',
    title: 'Tafsir Al-Fatiha',
    scholar: "Sheikh Ja'afar",
    durationSec: 1800,
    meta: 'Hausa',
    leading: { kind: 'artwork', url: 'https://media.example/c.jpg', position: 3 },
  });
});

test('lecturerLectureToRow maps nid, rpname, views and keeps a missing image as a placeholder', () => {
  expect(
    lecturerLectureToRow(
      { nid: 42, title: '', img: '', duration: '00:45:00', rpname: 'Sheikh Gumi', views: 15300 },
      1,
    ),
  ).toEqual({
    id: '42',
    title: 'Untitled',
    scholar: 'Sheikh Gumi',
    durationSec: 2700,
    meta: '15.3K plays',
    leading: { kind: 'artwork', url: null, position: 1 },
  });
});

test('albumTrackToRow takes the scholar from the album and numbers by position', () => {
  expect(
    albumTrackToRow(
      { id: 7, title: 'Dars 1', duration: '0', trackNumber: 9, plays: 0 },
      { position: 2, scholar: 'Dr. Isa Pantami' },
    ),
  ).toEqual({
    id: '7',
    title: 'Dars 1',
    scholar: 'Dr. Isa Pantami',
    durationSec: null,
    meta: null,
    leading: { kind: 'position', position: 2 },
  });
});

test('quranRecitationToRow prefers the surah track number over list position', () => {
  const row = quranRecitationToRow(
    { id: 'q1', title: 'Al-Baqarah', duration: '1:55:10', trackNumber: 2, plays: 1200 },
    { position: 1, reciter: 'Sheikh Sudais' },
  );
  expect(row.leading).toEqual({ kind: 'position', position: 2 });
  expect(row.scholar).toBe('Sheikh Sudais');
  expect(row.durationSec).toBe(6910);
  expect(row.meta).toBe('1.2K plays');
  expect(quranRecitationToRow({ id: 'q2', title: 'X', duration: '' }, { position: 5 }).leading).toEqual({
    kind: 'position',
    position: 5,
  });
});

test('searchLectureToRow falls back across the three API field generations', () => {
  const popular = {
    nid: 99,
    Title: 'Ramadan Lecture',
    rpname: 'Sheikh Daurawa',
    duration: '10:00',
    lec_img: 'https://media.example/l.jpg',
    page: 1,
    hasMore: false,
  } as SearchLecture;
  expect(searchLectureToRow(popular)).toEqual({
    id: '99',
    title: 'Ramadan Lecture',
    scholar: 'Sheikh Daurawa',
    durationSec: 600,
    meta: null,
    leading: { kind: 'artwork', url: 'https://media.example/l.jpg', position: undefined },
  });

  const search = {
    id: 's1',
    mp3_title: 'Search Hit',
    lecturer_name: 'Mal. Aminu',
    mp3_duration: '00:20:00',
    views: '2500',
    page: 1,
    hasMore: false,
  } as SearchLecture;
  expect(searchLectureToRow(search)).toMatchObject({
    id: 's1',
    title: 'Search Hit',
    scholar: 'Mal. Aminu',
    durationSec: 1200,
    meta: '2.5K plays',
    leading: { kind: 'artwork', url: null },
  });
});
