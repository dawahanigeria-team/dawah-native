import type { RequestConfig } from './base.api';
import {
  createTokenRefreshRetryConfig,
  isMissingAccessTokenError,
  normalizeAuthToken,
  readRefreshedTokens,
  shouldCaptureApiHttpError,
} from './base.api';

describe('createTokenRefreshRetryConfig', () => {
  test('strips an aborted signal from retry config and forces skipTokenRefresh', () => {
    const controller = new AbortController();
    controller.abort();

    const input: RequestConfig = {
      method: 'GET',
      signal: controller.signal,
      retry: true,
      headers: {
        Authorization: 'Bearer token',
      },
    };

    const result = createTokenRefreshRetryConfig(input);

    expect(result.signal).toBeUndefined();
    expect(result.skipTokenRefresh).toBe(true);
    expect(result.method).toBe('GET');
    expect(result.retry).toBe(true);
    expect(result.headers).toEqual({
      Authorization: 'Bearer token',
    });
  });
});

describe('isMissingAccessTokenError', () => {
  test('matches backend missing access token responses', () => {
    expect(isMissingAccessTokenError({ message: 'Access token is required' })).toBe(true);
    expect(isMissingAccessTokenError({ error: 'access token required' })).toBe(true);
  });

  test('does not match unrelated auth failures', () => {
    expect(isMissingAccessTokenError({ message: 'Token expired' })).toBe(false);
    expect(isMissingAccessTokenError({ message: 'Unauthorized' })).toBe(false);
  });
});

describe('normalizeAuthToken', () => {
  test('normalizes usable stored tokens', () => {
    expect(normalizeAuthToken(' token ')).toBe('token');
  });

  test('rejects empty and serialized nullish tokens', () => {
    expect(normalizeAuthToken(null)).toBeNull();
    expect(normalizeAuthToken(undefined)).toBeNull();
    expect(normalizeAuthToken('')).toBeNull();
    expect(normalizeAuthToken('  ')).toBeNull();
    expect(normalizeAuthToken('null')).toBeNull();
    expect(normalizeAuthToken('undefined')).toBeNull();
  });
});

describe('shouldCaptureApiHttpError', () => {
  test('suppresses missing access token responses', () => {
    expect(
      shouldCaptureApiHttpError(401, { message: 'Access token is required' }, false),
    ).toBe(false);
    expect(
      shouldCaptureApiHttpError(401, { message: 'Access token is required' }, true),
    ).toBe(false);
  });

  test('captures other API errors', () => {
    expect(shouldCaptureApiHttpError(500, { message: 'Server error' }, false)).toBe(true);
    expect(shouldCaptureApiHttpError(401, { message: 'Token expired' }, false)).toBe(true);
  });
});

describe('shouldCaptureApiHttpError and the refresh outcome', () => {
  /**
   * A refresh the server refused is the session ending - expected, and already
   * handled by signing the user out. Reporting it files one Sentry issue per
   * in-flight request every time somebody's session runs out.
   */
  test('suppresses a 401 whose refresh the server rejected', () => {
    expect(
      shouldCaptureApiHttpError(401, { message: 'Token expired' }, true, 'rejected'),
    ).toBe(false);
  });

  /**
   * A refresh we could not complete is a real anomaly, and it does NOT end the
   * session, so it stays visible.
   */
  test('still captures a 401 whose refresh never completed', () => {
    expect(
      shouldCaptureApiHttpError(401, { message: 'Token expired' }, true, 'unavailable'),
    ).toBe(true);
  });

  test('is unchanged when no refresh was attempted', () => {
    expect(shouldCaptureApiHttpError(401, { message: 'Token expired' }, true)).toBe(true);
    expect(shouldCaptureApiHttpError(500, { message: 'Server error' }, true, 'rejected')).toBe(
      true,
    );
  });
});

describe('the refresh request refusing our credentials', () => {
  /**
   * The refresh call is itself an API request, so it reaches the same error
   * path and reports its own 401 - before refreshAccessToken can classify it
   * as the session ending. The endpoint refuses with its own wording, so this
   * cannot be recognised from the message the way a missing access token can.
   */
  test('is not reported, whatever wording the endpoint refuses with', () => {
    expect(
      shouldCaptureApiHttpError(401, { message: 'Invalid refresh token' }, true, undefined, true),
    ).toBe(false);
    expect(
      shouldCaptureApiHttpError(403, { message: 'Refresh token revoked' }, true, undefined, true),
    ).toBe(false);
  });

  /** A refresh endpoint that is broken rather than refusing is still a defect. */
  test('but a 500 from the same request still is', () => {
    expect(
      shouldCaptureApiHttpError(500, { message: 'Server error' }, true, undefined, true),
    ).toBe(true);
  });

  test('and an ordinary request keeps reporting its 401s', () => {
    expect(shouldCaptureApiHttpError(401, { message: 'Invalid refresh token' }, true)).toBe(true);
    expect(shouldCaptureApiHttpError(403, { message: 'Forbidden' }, true)).toBe(true);
  });
});

describe('readRefreshedTokens', () => {
  const ok = { data: { tokens: { access_token: 'a', refresh_token: 'r' } } };

  test('accepts a usable pair', () => {
    expect(readRefreshedTokens(ok)).toEqual({ accessToken: 'a', refreshToken: 'r' });
  });

  /**
   * setAuthToken normalises a blank token to null, which clears the token we
   * still had. A 200 carrying one would otherwise sign the user out while
   * reporting the refresh as successful.
   */
  test.each([
    ['a missing access token', { data: { tokens: { refresh_token: 'r' } } }],
    ['a missing refresh token', { data: { tokens: { access_token: 'a' } } }],
    ['a blank token', { data: { tokens: { access_token: '  ', refresh_token: 'r' } } }],
    ['a serialised nullish token', { data: { tokens: { access_token: 'null', refresh_token: 'r' } } }],
    ['no tokens object', { data: {} }],
    ['no data', {}],
    ['nothing at all', undefined],
  ])('rejects %s', (_label, payload) => {
    expect(readRefreshedTokens(payload)).toBeNull();
  });
});
