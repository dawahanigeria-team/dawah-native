import { shouldSendSentryEvent } from './sentry.filters';

describe('shouldSendSentryEvent', () => {
  test('drops events in development by default', () => {
    expect(shouldSendSentryEvent({ isDevelopment: true, devFlagValue: undefined })).toBe(false);
    expect(shouldSendSentryEvent({ isDevelopment: true, devFlagValue: 'false' })).toBe(false);
  });

  test('allows events in development when explicitly enabled', () => {
    expect(shouldSendSentryEvent({ isDevelopment: true, devFlagValue: 'true' })).toBe(true);
  });

  test('always allows events in production', () => {
    expect(shouldSendSentryEvent({ isDevelopment: false, devFlagValue: undefined })).toBe(true);
    expect(shouldSendSentryEvent({ isDevelopment: false, devFlagValue: 'false' })).toBe(true);
  });
});
