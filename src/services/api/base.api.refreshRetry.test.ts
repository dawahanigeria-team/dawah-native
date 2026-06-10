import type { RequestConfig } from './base.api';
import {
  createTokenRefreshRetryConfig,
  isMissingAccessTokenError,
  normalizeAuthToken,
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
