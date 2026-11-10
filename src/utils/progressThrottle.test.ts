import { shouldWriteProgress } from './progressThrottle';

const base = {
  currentTime: 10.25,
  storedProgress: 10,
  nowMs: 100_250,
  lastWriteMs: 100_000,
  episodeId: '7',
  lastWriteEpisodeId: '7',
};

test('skips a 250 ms tick inside the same second', () => {
  expect(shouldWriteProgress(base)).toBe(false);
});

test('writes once a second has passed', () => {
  expect(shouldWriteProgress({ ...base, currentTime: 11, nowMs: 101_000 })).toBe(true);
});

test('a four-tick second produces exactly one write', () => {
  let stored = 10;
  let lastWriteMs = 100_000;
  let writes = 0;
  for (let i = 1; i <= 4; i++) {
    const currentTime = 10 + i * 0.25;
    const nowMs = 100_000 + i * 250;
    if (shouldWriteProgress({ ...base, currentTime, storedProgress: stored, nowMs, lastWriteMs })) {
      writes++;
      stored = currentTime;
      lastWriteMs = nowMs;
    }
  }
  expect(writes).toBe(1);
});

test('a backward seek writes immediately', () => {
  expect(shouldWriteProgress({ ...base, currentTime: 4 })).toBe(true);
});

test('a forward seek of more than 2 seconds writes immediately', () => {
  expect(shouldWriteProgress({ ...base, currentTime: 40 })).toBe(true);
});

test('a track change writes immediately', () => {
  expect(shouldWriteProgress({ ...base, episodeId: '8' })).toBe(true);
});

test('position 0 writes immediately', () => {
  expect(shouldWriteProgress({ ...base, currentTime: 0 })).toBe(true);
});
