import { formatClock, positionFromTouch } from './seekMath';

describe('positionFromTouch', () => {
  it('maps the middle of the bar to half the duration', () => {
    expect(positionFromTouch(150, 300, 3300)).toBe(1650);
  });

  it('maps a quarter of the bar to a quarter of the duration', () => {
    expect(positionFromTouch(75, 300, 3300)).toBe(825);
  });

  it('clamps a touch left of the bar to zero', () => {
    expect(positionFromTouch(-40, 300, 3300)).toBe(0);
  });

  it('clamps a touch right of the bar to the duration', () => {
    expect(positionFromTouch(340, 300, 3300)).toBe(3300);
  });

  it('returns zero when the bar has no width yet', () => {
    expect(positionFromTouch(10, 0, 3300)).toBe(0);
  });

  it('returns zero when the duration is unknown', () => {
    expect(positionFromTouch(150, 300, 0)).toBe(0);
    expect(positionFromTouch(150, 300, NaN)).toBe(0);
  });
});

describe('formatClock', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3300)).toBe('55:00');
  });

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('floors fractional seconds', () => {
    expect(formatClock(59.9)).toBe('0:59');
  });

  it('treats negative and non-finite values as zero', () => {
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(NaN)).toBe('0:00');
  });
});
