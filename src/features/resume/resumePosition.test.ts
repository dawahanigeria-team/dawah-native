import {
  countFinished,
  findSeriesResume,
  formatTimeLeft,
  pickResumable,
  resumePosition,
} from './resumePosition';

describe('resumePosition', () => {
  test('starts from the top when only a sample was heard', () => {
    expect(resumePosition(12, 3600)).toBe(0);
  });

  test('continues from where the listener stopped', () => {
    expect(resumePosition(2052, 3480)).toBe(2052);
  });

  test('treats the last minute as finished', () => {
    expect(resumePosition(3450, 3480)).toBe(0);
  });

  test('still resumes when the duration is unknown', () => {
    expect(resumePosition(600, 0)).toBe(600);
  });

  test('ignores a corrupt position', () => {
    expect(resumePosition(Number.NaN, 3480)).toBe(0);
  });
});

describe('pickResumable', () => {
  const history = [
    { lectureId: 'finished', duration: 3000, progress: 2990 },
    { lectureId: 'playing', duration: 3000, progress: 900 },
    { lectureId: 'older', duration: 3000, progress: 600 },
  ];

  test('takes the newest lecture still in progress', () => {
    expect(pickResumable(history)?.lectureId).toBe('playing');
  });

  test('skips the lecture already in the player', () => {
    expect(pickResumable(history, 'playing')?.lectureId).toBe('older');
  });

  test('returns nothing when no lecture is in progress', () => {
    expect(pickResumable([history[0]])).toBeUndefined();
  });
});

describe('formatTimeLeft', () => {
  test('describes the time remaining', () => {
    expect(formatTimeLeft(2040, 3480)).toBe('24 min left of 58 min');
  });

  test('uses hours for long lectures', () => {
    expect(formatTimeLeft(0, 4320)).toBe('1 hr 12 min left of 1 hr 12 min');
  });

  test('falls back to time listened without a duration', () => {
    expect(formatTimeLeft(600, 0)).toBe('10 min listened');
  });
});

describe('series resume', () => {
  const ids = ['a', 'b', 'c'];

  test('returns nothing for a series not started', () => {
    expect(findSeriesResume(ids, [{ lectureId: 'x', duration: 3000, progress: 900 }])).toBeNull();
  });

  test('continues a part left unfinished', () => {
    expect(findSeriesResume(ids, [{ lectureId: 'b', duration: 3000, progress: 900 }])).toEqual({
      index: 1,
      positionSec: 900,
    });
  });

  test('moves to the next part after a finished one', () => {
    expect(findSeriesResume(ids, [{ lectureId: 'a', duration: 3000, progress: 2990 }])).toEqual({
      index: 1,
      positionSec: 0,
    });
  });

  test('offers nothing once the last part is finished', () => {
    expect(findSeriesResume(ids, [{ lectureId: 'c', duration: 3000, progress: 2990 }])).toBeNull();
  });

  test('counts only finished parts of this series', () => {
    expect(
      countFinished(ids, [
        { lectureId: 'a', duration: 3000, progress: 2990 },
        { lectureId: 'b', duration: 3000, progress: 900 },
        { lectureId: 'x', duration: 3000, progress: 2990 },
      ]),
    ).toBe(1);
  });
});
