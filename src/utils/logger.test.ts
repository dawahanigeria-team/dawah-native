/* eslint-disable @typescript-eslint/no-require-imports */
const mockCaptureSentryException = jest.fn();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('logger.error', () => {
  const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
  const originalDev = runtime.__DEV__;

  beforeEach(() => {
    jest.resetModules();
    mockCaptureSentryException.mockReset();
    mockConsoleError.mockClear();
    runtime.__DEV__ = false;
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
    mockConsoleError.mockRestore();
  });

  test('sends error telemetry to Sentry', () => {
    jest.doMock('../services/config/sentry.config', () => ({
      captureSentryException: mockCaptureSentryException,
    }));

    const { logger } = require('./logger');
    const error = new Error('boom');

    logger.error('Failed to fetch announcements', error, { screen: 'Profile' });

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to fetch announcements', error, { screen: 'Profile' });
    // Sentry is the only destination now: PostHog was reporting every crash a
    // second time, which is what made the duplicate issues in Sentry's inbox.
    expect(mockCaptureSentryException).toHaveBeenCalledWith(error, {
      message: 'Failed to fetch announcements',
      screen: 'Profile',
    }, {
    });
  });
});
