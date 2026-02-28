import type { RequestConfig } from './base.api';
import { createTokenRefreshRetryConfig } from './base.api';

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
