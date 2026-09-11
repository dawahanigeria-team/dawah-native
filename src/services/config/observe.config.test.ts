import {
  buildObserveConfig,
  DEFAULT_PRODUCTION_SAMPLE_RATE,
  FILTERED_ROUTE_PARAMS,
  resolveEnvironment,
  type ObserveEnvironment,
} from './observe.config';

const env = (overrides: Partial<ObserveEnvironment> = {}): ObserveEnvironment => ({
  isDevelopment: false,
  channel: 'production',
  sampleRateValue: undefined,
  enabledValue: undefined,
  dispatchInDebugValue: undefined,
  routerIntegrationValue: undefined,
  ...overrides,
});

describe('Observe environment labelling', () => {
  // A preview build is a release build. Without the channel, preview numbers
  // land in the production dashboard and a handful of internal testers on
  // developer-grade phones move the production median.
  test('separates preview from production', () => {
    expect(resolveEnvironment({ isDevelopment: false, channel: 'preview' })).toBe('preview');
    expect(resolveEnvironment({ isDevelopment: false, channel: 'production' })).toBe('production');
  });

  test('falls back when there is no channel, as in a development build', () => {
    expect(resolveEnvironment({ isDevelopment: true, channel: null })).toBe('development');
    expect(resolveEnvironment({ isDevelopment: false, channel: null })).toBe('production');
  });
});

describe('Observe sampling', () => {
  test('samples a quarter of production installations by default', () => {
    expect(buildObserveConfig(env()).sampleRate).toBe(DEFAULT_PRODUCTION_SAMPLE_RATE);
  });

  test('never samples away preview or development, where devices are countable', () => {
    expect(buildObserveConfig(env({ channel: 'preview' })).sampleRate).toBe(1);
    expect(
      buildObserveConfig(env({ channel: null, isDevelopment: true })).sampleRate,
    ).toBe(1);
  });

  test('the override only applies to production', () => {
    expect(buildObserveConfig(env({ sampleRateValue: '0.5' })).sampleRate).toBe(0.5);
    expect(
      buildObserveConfig(env({ channel: 'preview', sampleRateValue: '0.5' })).sampleRate,
    ).toBe(1);
  });

  test('clamps and ignores nonsense rather than disabling collection', () => {
    expect(buildObserveConfig(env({ sampleRateValue: '5' })).sampleRate).toBe(1);
    expect(buildObserveConfig(env({ sampleRateValue: '-1' })).sampleRate).toBe(0);
    expect(buildObserveConfig(env({ sampleRateValue: 'abc' })).sampleRate).toBe(
      DEFAULT_PRODUCTION_SAMPLE_RATE,
    );
  });
});

describe('Observe router integration', () => {
  // Off by default: everything it produces (nav_tti, nav_cold_ttr,
  // nav_warm_ttr, observe:routes) needs a paid EAS plan, and while it is on it
  // wraps markInteractive in a focus check that silently dropped startup TTI.
  test('is off unless explicitly enabled', () => {
    expect(buildObserveConfig(env()).integrations?.['expo-router']).toBeUndefined();
    for (const channel of ['production', 'preview', null]) {
      expect(
        buildObserveConfig(env({ channel })).integrations?.['expo-router'],
      ).toBeUndefined();
    }
  });

  test('only "true" turns it on, so a stray value cannot spend event budget', () => {
    for (const value of ['false', '1', 'yes', '']) {
      expect(
        buildObserveConfig(env({ routerIntegrationValue: value })).integrations?.[
          'expo-router'
        ],
      ).toBeUndefined();
    }
  });
});

describe('Observe route parameter privacy', () => {
  // When the integration IS enabled it exports routeParams with every
  // navigation metric, and `/reset-password?email=...` carries a real address
  // while `/search?q=...` carries whatever the user typed.
  test('filters the params that carry user data once enabled', () => {
    const filtered = buildObserveConfig(env({ routerIntegrationValue: 'true' }))
      .integrations?.['expo-router'];
    expect(filtered).toEqual({ filteredParams: FILTERED_ROUTE_PARAMS });
    expect(FILTERED_ROUTE_PARAMS).toEqual(expect.arrayContaining(['email', 'q']));
  });

  test('filters in every environment, not just production', () => {
    for (const channel of ['production', 'preview', null]) {
      const config = buildObserveConfig(
        env({ channel, routerIntegrationValue: 'true' }),
      );
      expect(config.integrations?.['expo-router']).toEqual({
        filteredParams: FILTERED_ROUTE_PARAMS,
      });
    }
  });
});

describe('Observe dispatching', () => {
  test('dispatches by default and can be killed by environment variable', () => {
    expect(buildObserveConfig(env()).dispatchingEnabled).toBe(true);
    expect(buildObserveConfig(env({ enabledValue: 'false' })).dispatchingEnabled).toBe(false);
  });

  // Metro-served debug builds measure the bundler, not the app.
  test('ignores debug builds unless explicitly asked', () => {
    expect(buildObserveConfig(env()).dispatchInDebug).toBe(false);
    expect(buildObserveConfig(env({ dispatchInDebugValue: 'true' })).dispatchInDebug).toBe(true);
  });
});
