/**
 * Resolve a promise within a bounded amount of time.
 *
 * Startup storage and asset reads are conveniences, not reasons to keep the
 * entire app behind a permanent spinner. If a native module stalls, callers
 * can continue with a safe default and recover on the next launch.
 */
export async function withTimeoutFallback<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
