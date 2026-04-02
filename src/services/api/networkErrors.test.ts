import {
  isCancelledErrorText,
  isCancelledRequestError,
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
