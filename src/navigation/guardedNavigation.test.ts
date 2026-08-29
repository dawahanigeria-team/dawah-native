import {
  DUPLICATE_NAVIGATION_WINDOW_MS,
  navigationKey,
  shouldAllowNavigation,
} from './guardedNavigation';

const W = DUPLICATE_NAVIGATION_WINDOW_MS;

describe('guarded navigation', () => {
  test('the first navigation to a route is always allowed', () => {
    expect(shouldAllowNavigation('/lecturer/44107', null, 1_000)).toBe(true);
  });

  test('a double tap on the same card is swallowed', () => {
    const last = { key: '/lecturer/44107', at: 1_000 };
    // A real double tap lands ~150-300ms apart.
    expect(shouldAllowNavigation('/lecturer/44107', last, 1_200)).toBe(false);
  });

  test('a different lecturer is never blocked', () => {
    const last = { key: '/lecturer/44107', at: 1_000 };
    expect(shouldAllowNavigation('/lecturer/39432', last, 1_050)).toBe(true);
  });

  test('the same route is allowed again once the window has passed', () => {
    const last = { key: '/lecturer/44107', at: 1_000 };
    expect(shouldAllowNavigation('/lecturer/44107', last, 1_000 + W)).toBe(true);
  });

  test('the boundary is exclusive so the window cannot block forever', () => {
    const last = { key: '/lecturer/44107', at: 1_000 };
    expect(shouldAllowNavigation('/lecturer/44107', last, 1_000 + W - 1)).toBe(
      false,
    );
    expect(shouldAllowNavigation('/lecturer/44107', last, 1_000 + W)).toBe(true);
  });

  test('a backwards clock jump does not strand the user', () => {
    // NTP correction or the user changing the device clock: elapsed is
    // negative, and refusing to navigate would be the worse failure.
    const last = { key: '/lecturer/44107', at: 10_000 };
    expect(shouldAllowNavigation('/lecturer/44107', last, 1_000)).toBe(true);
  });

  test('both href forms collapse to a comparable key', () => {
    expect(navigationKey('/lecturer/44107')).toBe('/lecturer/44107');
    expect(navigationKey({ pathname: '/lecturer/[id]' })).toBe('/lecturer/[id]');
    // Param order must not change the key, or the name-hint fallback in
    // lecture/[id].tsx would slip past the guard.
    expect(
      navigationKey({
        pathname: '/lecturer/[id]',
        params: { id: '0', name: 'Dr Ibrahim Jalo Jalingo' },
      }),
    ).toBe(
      navigationKey({
        pathname: '/lecturer/[id]',
        params: { name: 'Dr Ibrahim Jalo Jalingo', id: '0' },
      }),
    );
    // Different scholars must still produce different keys.
    expect(
      navigationKey({ pathname: '/lecturer/[id]', params: { id: '0', name: 'A' } }),
    ).not.toBe(
      navigationKey({ pathname: '/lecturer/[id]', params: { id: '0', name: 'B' } }),
    );
  });

  test('the window covers the observed lectures request time', () => {
    // The race needs a second mount while the first screen's lectures request
    // is still in flight (measured 0.6-2.4s). The guard only has to cover the
    // double-tap interval, not that whole window - see the module comment.
    expect(W).toBeGreaterThanOrEqual(500);
    expect(W).toBeLessThan(1_500);
  });
});
