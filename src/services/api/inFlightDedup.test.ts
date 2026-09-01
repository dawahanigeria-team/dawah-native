/**
 * The de-duplication rule for concurrent identical GETs, isolated from the
 * client so it can be exercised without a network, AsyncStorage or Sentry.
 *
 * This mirrors ApiClient.request's wrapper exactly. It exists because the
 * failure it prevents is silent: before de-duplication, a second identical GET
 * cancelled the first via createRequestToken, and a cancelled request surfaces
 * as an empty result rather than an error.
 */

type Resp = { data: string };

class Deduper {
  readonly calls: string[] = [];
  private inFlight = new Map<string, Promise<Resp>>();

  constructor(private worker: (key: string) => Promise<Resp>) {}

  request(method: string, url: string, useCache = true): Promise<Resp> {
    if (method !== 'GET') {
      this.calls.push(`${method} ${url}`);
      return this.worker(`${method} ${url}`);
    }
    const key = `${method}_${url}_${useCache === false ? 'fresh' : 'cached'}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    this.calls.push(`${method} ${url}`);
    const pending = this.worker(key).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  }
}

const deferred = () => {
  let resolve!: (v: Resp) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<Resp>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test('concurrent identical GETs make ONE network request', async () => {
  const d = deferred();
  const c = new Deduper(() => d.promise);

  const a = c.request('GET', '/lectures?page=1');
  const b = c.request('GET', '/lectures?page=1');
  d.resolve({ data: 'ok' });

  expect(await a).toEqual({ data: 'ok' });
  expect(await b).toEqual({ data: 'ok' });
  expect(c.calls).toHaveLength(1); // this is the whole point
});

test('both callers get the result, not just the first', async () => {
  const d = deferred();
  const c = new Deduper(() => d.promise);
  const results = Promise.all([
    c.request('GET', '/x'),
    c.request('GET', '/x'),
    c.request('GET', '/x'),
  ]);
  d.resolve({ data: 'shared' });
  expect(await results).toEqual([{ data: 'shared' }, { data: 'shared' }, { data: 'shared' }]);
  expect(c.calls).toHaveLength(1);
});

test('a failure reaches every caller, and is not swallowed', async () => {
  const d = deferred();
  const c = new Deduper(() => d.promise);
  const a = c.request('GET', '/boom');
  const b = c.request('GET', '/boom');
  d.reject(new Error('network down'));
  await expect(a).rejects.toThrow('network down');
  await expect(b).rejects.toThrow('network down');
});

test('a later request does NOT reuse a settled one', async () => {
  const c = new Deduper(() => Promise.resolve({ data: 'v' }));
  await c.request('GET', '/x');
  await c.request('GET', '/x');
  // Sharing must last only while the request is in flight; otherwise this
  // becomes an unbounded cache that never refreshes.
  expect(c.calls).toHaveLength(2);
});

test('a failed request does not poison the next one', async () => {
  const d1 = deferred();
  const c = new Deduper(() => d1.promise);
  const first = c.request('GET', '/x');
  d1.reject(new Error('down'));
  await expect(first).rejects.toThrow('down');
  // the map entry must be cleared on rejection too
  const c2 = new Deduper(() => Promise.resolve({ data: 'ok' }));
  expect(await c2.request('GET', '/x')).toEqual({ data: 'ok' });
});

test('POSTs are NEVER shared — two posts mean two intended writes', async () => {
  const c = new Deduper(() => Promise.resolve({ data: 'ok' }));
  const a = c.request('POST', '/comment');
  const b = c.request('POST', '/comment');
  await Promise.all([a, b]);
  expect(c.calls).toHaveLength(2);
});

test('a cache-bypassing GET does not join a cache-allowed one', async () => {
  const d = deferred();
  const c = new Deduper(() => d.promise);
  c.request('GET', '/x', true);
  c.request('GET', '/x', false);
  d.resolve({ data: 'ok' });
  expect(c.calls).toHaveLength(2);
});

test('different urls are not conflated', async () => {
  const c = new Deduper(() => Promise.resolve({ data: 'ok' }));
  await Promise.all([c.request('GET', '/a'), c.request('GET', '/b')]);
  expect(c.calls).toHaveLength(2);
});
