import { createPlayTracker, PLAY_THRESHOLD_MS } from './playEvents';

const setup = () => {
  const sent: string[] = [];
  const tracker = createPlayTracker((lectureId) => sent.push(lectureId));
  return { sent, tracker };
};

test('a lecture counts as played once 30 seconds have actually been heard', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= PLAY_THRESHOLD_MS; t += 1000) {
    tracker.tick({ lectureId: '139638', isPlaying: true, nowMs: t });
  }
  expect(sent).toEqual(['139638']);
});

test('it is reported once per listen, not on every later tick', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 5 * 60_000; t += 1000) {
    tracker.tick({ lectureId: '139638', isPlaying: true, nowMs: t });
  }
  expect(sent).toEqual(['139638']);
});

test('paused time and skipping through a lecture after a few seconds do not count', () => {
  const { sent, tracker } = setup();
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 0 });
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 10_000 });
  tracker.tick({ lectureId: '1', isPlaying: false, nowMs: 11_000 });
  tracker.tick({ lectureId: '1', isPlaying: false, nowMs: 600_000 });
  tracker.tick({ lectureId: '2', isPlaying: true, nowMs: 600_500 });
  tracker.tick({ lectureId: '2', isPlaying: true, nowMs: 605_000 });
  expect(sent).toEqual([]);
});

test('a long gap between ticks (app suspended, clock change) adds at most a few seconds', () => {
  const { sent, tracker } = setup();
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 0 });
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 3_600_000 });
  expect(sent).toEqual([]);
});

test('listening resumes counting where it left off after a pause', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 20_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  tracker.tick({ lectureId: '1', isPlaying: false, nowMs: 21_000 });
  for (let t = 100_000; t <= 112_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  expect(sent).toEqual(['1']);
});

test('switching lectures starts a new listen, and coming back later counts again', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 31_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  for (let t = 40_000; t <= 71_000; t += 1000) tracker.tick({ lectureId: '2', isPlaying: true, nowMs: t });
  for (let t = 80_000; t <= 111_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  expect(sent).toEqual(['1', '2', '1']);
});

test('items without a numeric catalogue id are never reported', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 40_000; t += 1000) tracker.tick({ lectureId: 'local-file.mp3', isPlaying: true, nowMs: t });
  expect(sent).toEqual([]);
});
