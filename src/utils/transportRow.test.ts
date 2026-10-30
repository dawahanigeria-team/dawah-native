import { buildTransportRow, nextRepeatMode, type TransportInput } from './transportRow';

const noop = () => {};

const base = (over: Partial<TransportInput> = {}): TransportInput => ({
  repeatMode: 'off',
  isShuffled: false,
  queueLength: 1,
  isCurrentLecture: true,
  onShuffle: noop,
  onSkipBack: noop,
  onSkipForward: noop,
  onSetRepeat: noop,
  ...over,
});

const byId = (input: TransportInput, id: string) =>
  buildTransportRow(input).find((b) => b.id === id)!;

describe('nextRepeatMode', () => {
  it('cycles off, all, one, off', () => {
    expect(nextRepeatMode('off')).toBe('all');
    expect(nextRepeatMode('all')).toBe('one');
    expect(nextRepeatMode('one')).toBe('off');
  });
});

describe('buildTransportRow', () => {
  it('hides shuffle for a queue of one', () => {
    expect(byId(base({ queueLength: 1 }), 'shuffle').visible).toBe(false);
  });

  it('shows shuffle for a queue of two or more on the current lecture', () => {
    expect(byId(base({ queueLength: 2 }), 'shuffle').visible).toBe(true);
  });

  it('hides shuffle when the lecture is not the current one', () => {
    expect(byId(base({ queueLength: 5, isCurrentLecture: false }), 'shuffle').visible).toBe(false);
  });

  it('labels the skip buttons with their seconds', () => {
    const back = byId(base(), 'skipBack');
    const fwd = byId(base(), 'skipForward');
    expect([back.caption, back.accessibilityLabel]).toEqual(['15s', 'Skip back 15 seconds']);
    expect([fwd.caption, fwd.accessibilityLabel]).toEqual(['30s', 'Skip forward 30 seconds']);
  });

  it('disables skips when the lecture is not the current one', () => {
    const row = buildTransportRow(base({ isCurrentLecture: false }));
    expect(row.filter((b) => b.id.startsWith('skip')).map((b) => b.enabled)).toEqual([false, false]);
  });

  it('requests the next repeat mode on press', () => {
    const calls: string[] = [];
    byId(base({ repeatMode: 'all', onSetRepeat: (m) => calls.push(m) }), 'repeat').onPress();
    expect(calls).toEqual(['one']);
  });

  it('reflects the repeat mode in caption, active flag and spoken label', () => {
    const one = byId(base({ repeatMode: 'one' }), 'repeat');
    expect([one.caption, one.active]).toEqual(['One', true]);
    expect(one.accessibilityLabel).toBe('Repeating this lecture. Double tap to turn repeat off.');
    const off = byId(base({ repeatMode: 'off' }), 'repeat');
    expect([off.caption, off.active]).toEqual(['Off', false]);
  });
});
