/* eslint-disable @typescript-eslint/no-require-imports */
const mockCaptureSentryException = jest.fn();
const mockCapturePostHogException = jest.fn();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('logger.error', () => {
  const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
  const originalDev = runtime.__DEV__;

  beforeEach(() => {
    jest.resetModules();
    mockCaptureSentryException.mockReset();
    mockCapturePostHogException.mockReset();
    mockConsoleError.mockClear();
    runtime.__DEV__ = false;
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
    mockConsoleError.mockRestore();
  });

  test('sends error telemetry to PostHog and Sentry without double-posthog forwarding', () => {
    jest.doMock('../services/config/sentry.config', () => ({
      captureSentryException: mockCaptureSentryException,
    }));

    jest.doMock('../services/config/posthog.config', () => ({
      capturePostHogException: mockCapturePostHogException,
    }));

    const { logger } = require('./logger');
    const error = new Error('boom');

    logger.error('Failed to fetch announcements', error, { screen: 'Profile' });

    expect(mockConsoleError).toHaveBeenCalledWith('Failed to fetch announcements', error, { screen: 'Profile' });
    expect(mockCapturePostHogException).toHaveBeenCalledWith(error, {
      message: 'Failed to fetch announcements',
      screen: 'Profile',
    });
    expect(mockCaptureSentryException).toHaveBeenCalledWith(error, {
      message: 'Failed to fetch announcements',
      screen: 'Profile',
    }, {
      alsoSendToPostHog: false,
    });
  });
});
