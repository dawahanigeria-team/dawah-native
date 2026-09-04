import {
  isCancelledErrorText,
  isCancelledRequestError,
  isExpectedConnectivityMessage,
  isTransientNetworkError,
  isTransientNetworkErrorText,
} from './networkErrors';

describe('networkErrors', () => {
  test('detects cancelled request errors', () => {
    expect(isCancelledRequestError(new Error('Fetch request has been canceled'))).toBe(true);
    expect(isCancelledRequestError({ code: 'ERR_CANCELED' })).toBe(true);
    expect(isCancelledErrorText('Request cancelled')).toBe(true);
  });

  test('detects transient SSL/network transport failures', () => {
    const sslAbortError = new Error(
      'Read error: ssl=0x787c684108: I/O error during system call, Software caused connection abort',
    );

    expect(isTransientNetworkError(sslAbortError)).toBe(true);
    expect(isTransientNetworkErrorText('Download failed')).toBe(true);
    expect(isTransientNetworkErrorText('Unable to resolve host backend.dawahbox.com')).toBe(true);
    expect(isTransientNetworkErrorText('The network connection was lost.')).toBe(true);
  });

  test('does not classify cancellation as transient network error', () => {
    expect(isTransientNetworkError(new Error('Fetch request has been canceled'))).toBe(false);
  });

  test('ignores unrelated errors', () => {
    expect(isCancelledRequestError(new Error('Permission denied'))).toBe(false);
    expect(isTransientNetworkError(new Error('Invalid JSON response'))).toBe(false);
  });
});

describe('isExpectedConnectivityMessage', () => {
  test('matches the connectivity wording the app shows the user', () => {
    expect(isExpectedConnectivityMessage('The internet connection appears to be offline.')).toBe(true);
    expect(isExpectedConnectivityMessage('The request timed out.')).toBe(true);
    expect(
      isExpectedConnectivityMessage(
        'The request is taking longer than usual. Please check your internet connection and try again.',
      ),
    ).toBe(true);
  });

  test('stays out of transient-network handling, which rewrites user-facing messages', () => {
    expect(isTransientNetworkErrorText('The request timed out.')).toBe(false);
    expect(isTransientNetworkErrorText('The internet connection appears to be offline.')).toBe(false);
  });

  test('ignores unrelated failures', () => {
    expect(isExpectedConnectivityMessage('Audio loading timeout')).toBe(false);
    expect(isExpectedConnectivityMessage('')).toBe(false);
  });
});
