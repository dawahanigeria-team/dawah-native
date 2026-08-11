import { withTimeoutFallback } from './withTimeoutFallback';

describe('withTimeoutFallback', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the resolved value before the deadline', async () => {
    await expect(withTimeoutFallback(Promise.resolve('ready'), 'fallback', 100)).resolves.toBe(
      'ready',
    );
  });

  it('returns the fallback when the operation stalls', async () => {
    jest.useFakeTimers();
    const result = withTimeoutFallback(new Promise<string>(() => {}), 'fallback', 100);

    await jest.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe('fallback');
  });
});
