import { createPlayTracker, PLAY_THRESHOLD_MS, sendPlayEvent } from './playEvents';

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => store.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
    },
  };
});

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

test('time spent paused never tops a listen up to 30 seconds', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 20_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  tracker.tick({ lectureId: '1', isPlaying: false, nowMs: 21_000 });
  tracker.tick({ lectureId: '1', isPlaying: false, nowMs: 300_000 });
  for (let t = 400_000; t <= 408_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  expect(sent).toEqual([]);
});

test('repeat-one replaying the same lecture counts each pass as a listen', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 31_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  tracker.startNewListen();
  for (let t = 32_000; t <= 63_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  expect(sent).toEqual(['1', '1']);
});

test('closing the player and reopening the same lecture is a new listen, without carrying old time', () => {
  const { sent, tracker } = setup();
  for (let t = 0; t <= 31_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  tracker.startNewListen();
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 34_000 });
  tracker.tick({ lectureId: '1', isPlaying: true, nowMs: 35_000 });
  expect(sent).toEqual(['1']);
  for (let t = 36_000; t <= 64_000; t += 1000) tracker.tick({ lectureId: '1', isPlaying: true, nowMs: t });
  expect(sent).toEqual(['1', '1']);
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

describe('sending', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  test('plays sent back to back are both delivered, not cancelled as duplicates', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    global.fetch = fetchMock as unknown as typeof fetch;
    await Promise.all([sendPlayEvent('1'), sendPlayEvent('2')]);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).lecture_id);
    expect(bodies.sort()).toEqual([1, 2]);
    expect(fetchMock.mock.calls[0][1].headers['x-project']).toBeTruthy();
    const devices = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).device_id);
    expect(devices[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(devices[1]).toBe(devices[0]);
  });

  test('a failed send is swallowed', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(sendPlayEvent('1')).resolves.toBeUndefined();
  });
});
