import { getLastCheckAfterAttempt, shouldThrottleUpdateCheck } from './UpdatesProvider.checks';

describe('UpdatesProvider check throttling', () => {
  test('throttles checks inside interval window', () => {
    expect(shouldThrottleUpdateCheck(1_000, 900, 200)).toBe(true);
  });

  test('does not throttle checks after interval window', () => {
    expect(shouldThrottleUpdateCheck(1_500, 900, 200)).toBe(false);
  });

  test('does not advance last check timestamp when attempt fails', () => {
    expect(
      getLastCheckAfterAttempt({
        previousLastCheckMs: 0,
        nowMs: 10_000,
        attemptSucceeded: false,
      })
    ).toBe(0);
  });

  test('advances last check timestamp when attempt succeeds', () => {
    expect(
      getLastCheckAfterAttempt({
        previousLastCheckMs: 0,
        nowMs: 10_000,
        attemptSucceeded: true,
      })
    ).toBe(10_000);
  });
});
