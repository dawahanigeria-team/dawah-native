import {
  buildLecturerFollowReturnTo,
  buildReciterFollowReturnTo,
  parseAutoFollowFlag,
} from './lecturerFollowAuth';

test('buildLecturerFollowReturnTo adds autoFollow param', () => {
  expect(buildLecturerFollowReturnTo(123)).toBe('/lecturer/123?autoFollow=1');
  expect(buildLecturerFollowReturnTo('abc')).toBe('/lecturer/abc?autoFollow=1');
});

test('buildReciterFollowReturnTo adds autoFollow param', () => {
  expect(buildReciterFollowReturnTo(321)).toBe('/quran-reciter/321?autoFollow=1');
  expect(buildReciterFollowReturnTo('xyz')).toBe('/quran-reciter/xyz?autoFollow=1');
});

test('parseAutoFollowFlag handles string and array values', () => {
  expect(parseAutoFollowFlag(undefined)).toBe(false);
  expect(parseAutoFollowFlag('')).toBe(false);
  expect(parseAutoFollowFlag('0')).toBe(false);
  expect(parseAutoFollowFlag('1')).toBe(true);
  expect(parseAutoFollowFlag('true')).toBe(true);
  expect(parseAutoFollowFlag('TRUE')).toBe(true);
  expect(parseAutoFollowFlag(['1'])).toBe(true);
});
