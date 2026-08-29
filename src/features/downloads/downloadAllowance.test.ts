import { resolveDownloadAllowance } from './downloadAllowance';

const free = {
  isUnlimited: false,
  isAuthenticated: true,
  downloadCount: 0,
  limit: 5,
};

describe('free download allowance', () => {
  test('a signed-in free user starts the month with five', () => {
    const result = resolveDownloadAllowance(free);
    expect(result.canDownload).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.reason).toBe('none');
  });

  test('the fifth download is still allowed', () => {
    // Off-by-one guard: the limit is downloads permitted, not the index of the
    // first refusal.
    const result = resolveDownloadAllowance({ ...free, downloadCount: 4 });
    expect(result.canDownload).toBe(true);
    expect(result.remaining).toBe(1);
  });

  test('the sixth is refused with the upsell', () => {
    const result = resolveDownloadAllowance({ ...free, downloadCount: 5 });
    expect(result.canDownload).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBe('monthly_limit_reached');
  });

  test('a stale count past the limit never renders a negative allowance', () => {
    const result = resolveDownloadAllowance({ ...free, downloadCount: 9 });
    expect(result.remaining).toBe(0);
    expect(result.canDownload).toBe(false);
  });

  test('a signed-out user is asked to sign in, not to pay', () => {
    // The quota is per user server-side, so an anonymous download cannot be
    // metered. Showing the upsell here would hide the free allowance.
    const result = resolveDownloadAllowance({
      ...free,
      isAuthenticated: false,
    });
    expect(result.canDownload).toBe(false);
    expect(result.reason).toBe('requires_sign_in');
  });

  test('premium is unlimited and never metered', () => {
    const result = resolveDownloadAllowance({
      ...free,
      isUnlimited: true,
      downloadCount: 500,
    });
    expect(result.canDownload).toBe(true);
    expect(result.isUnlimited).toBe(true);
    expect(result.remaining).toBeNull();
  });

  test('premium is allowed even before the auth flag has hydrated', () => {
    // offline_download can only be true for a signed-in user, so an
    // isAuthenticated that has not caught up must not block them.
    const result = resolveDownloadAllowance({
      ...free,
      isUnlimited: true,
      isAuthenticated: false,
    });
    expect(result.canDownload).toBe(true);
  });
});
