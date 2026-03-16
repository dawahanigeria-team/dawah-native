/* eslint-disable @typescript-eslint/no-require-imports */
const mockCapture = jest.fn();
const mockCaptureException = jest.fn();
const mockFlush = jest.fn(() => Promise.resolve());

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    captureException: mockCaptureException,
    flush: mockFlush,
  })),
}));

jest.mock('../../config/env', () => ({
  ENV: {
    POSTHOG_KEY: 'phc_test_key',
    POSTHOG_HOST: 'https://eu.i.posthog.com',
    NODE_ENV: 'production',
  },
}));

jest.mock('../api/networkErrors', () => ({
  isCancelledRequestError: jest.fn(() => false),
  isTransientNetworkError: jest.fn(() => false),
}));

describe('capturePostHogException', () => {
  beforeEach(() => {
    mockCapture.mockClear();
    mockCaptureException.mockClear();
    mockFlush.mockClear();
    jest.resetModules();
  });

  test('captures a reliable app_error event, sends captureException, and flushes once', () => {
    const { capturePostHogException } = require('./posthog.config');

    const error = new Error('boom');
    error.stack = 'Error: boom\n    at test';

    capturePostHogException(error, { screen: 'Profile' });

    expect(mockCapture).toHaveBeenCalledWith('app_error', {
      error_name: 'Error',
      error_message: 'boom',
      error_stack: 'Error: boom\n    at test',
      error_source: 'manual_capture',
      screen: 'Profile',
    });
    expect(mockCaptureException).toHaveBeenCalledWith(error, { screen: 'Profile' });
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });
});
