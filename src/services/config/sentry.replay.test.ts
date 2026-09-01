import { buildReplayOptions } from './sentry.replay';

describe('Session Replay privacy', () => {
  // These two assertions are the point of the file. Replay uploads a recording
  // of the user's screen; with masking off it uploads whatever they typed and
  // whatever account details were visible. This shipped as false on iOS.
  test('ALWAYS masks text and images, on every platform and environment', () => {
    for (const platform of ['ios', 'android', 'web']) {
      for (const isDevelopment of [true, false]) {
        const o = buildReplayOptions({ platform, isDevelopment });
        expect(o.maskAllText).toBe(true);
        expect(o.maskAllImages).toBe(true);
      }
    }
  });

  test('masking stays on even where replay is disabled', () => {
    const o = buildReplayOptions({ platform: 'android', isDevelopment: false });
    expect(o.enabled).toBe(false);
    expect(o.maskAllText).toBe(true);
    expect(o.maskAllImages).toBe(true);
  });
});

describe('Session Replay bandwidth', () => {
  test('does not record whole sessions in production', () => {
    // 0.1 here meant one in ten sessions recorded end to end and uploaded, on
    // an audience overwhelmingly using metered mobile data.
    const o = buildReplayOptions({ platform: 'ios', isDevelopment: false });
    expect(o.sessionSampleRate).toBe(0);
  });

  test('still uploads a replay when something actually breaks', () => {
    const o = buildReplayOptions({ platform: 'ios', isDevelopment: false });
    expect(o.onErrorSampleRate).toBe(1.0);
  });

  test('records full sessions in development, where it costs nobody', () => {
    const o = buildReplayOptions({ platform: 'ios', isDevelopment: true });
    expect(o.sessionSampleRate).toBe(1.0);
  });
});

describe('Session Replay platform gate', () => {
  test('stays off on Android', () => {
    const o = buildReplayOptions({ platform: 'android', isDevelopment: false });
    expect(o.enabled).toBe(false);
    expect(o.sessionSampleRate).toBe(0);
    expect(o.onErrorSampleRate).toBe(0);
  });

  test('is on for iOS', () => {
    expect(buildReplayOptions({ platform: 'ios', isDevelopment: false }).enabled).toBe(true);
  });
});
