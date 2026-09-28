/**
 * The recent-lecture pool is cached in AsyncStorage under keys built as
 * `cache_${method}_${url}`, and cleared by substring match on a pattern.
 *
 * recentApi.clearPersistentCache() passes the endpoint path as that pattern. If
 * the two ever stop lining up the failure is silent and nasty: "refresh" clears
 * only the in-memory pool, the refetch is served the same persisted response, and
 * the user is shown identical content — for as long as the TTL, now an hour.
 */

const BASE_URL = 'https://api.dawahnigeria.com';
const RECENT_ENDPOINT = '/api/leclisting_recent.php';

/** Mirrors ApiClient.buildUrl. */
const buildUrl = (endpoint: string, params: Record<string, string | number>) => {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `${BASE_URL}${endpoint}?${qs}` : `${BASE_URL}${endpoint}`;
};

/** Mirrors ApiClient.getCacheKey. */
const cacheKey = (url: string, method = 'GET') => `cache_${method}_${url}`;

/** Mirrors the filter inside ApiClient.clearCache. */
const matches = (key: string, pattern: string) =>
  key.startsWith('cache_') && key.includes(pattern);

describe('recent pool cache invalidation', () => {
  const responses = [30, 150].map((limit) =>
    cacheKey(buildUrl(RECENT_ENDPOINT, { action: 'get_recent_audio', page: 1, limit })),
  );

  test('the endpoint pattern matches the first-paint and pooled responses', () => {
    expect(responses).toHaveLength(2);
    for (const key of responses) {
      expect(matches(key, RECENT_ENDPOINT)).toBe(true);
    }
  });

  test('matches pages that carry language and lecturer filters', () => {
    const filtered = cacheKey(
      buildUrl(RECENT_ENDPOINT, {
        action: 'get_recent_audio',
        page: 1,
        language_ids: '7,8',
        lecturer_ids: '12,34',
      }),
    );
    expect(matches(filtered, RECENT_ENDPOINT)).toBe(true);
  });

  test('does not clear unrelated endpoints', () => {
    for (const other of ['/api/all_rps_api.php', '/api/announcements.php', '/api/playlistApi.php']) {
      const key = cacheKey(buildUrl(other, { page: 1 }));
      expect(matches(key, RECENT_ENDPOINT)).toBe(false);
    }
  });

  test('filters are part of the key, so one filter never reads another’s cache', () => {
    const yoruba = cacheKey(buildUrl(RECENT_ENDPOINT, { page: 1, language_ids: '7' }));
    const hausa = cacheKey(buildUrl(RECENT_ENDPOINT, { page: 1, language_ids: '8' }));
    expect(yoruba).not.toEqual(hausa);
  });
});
