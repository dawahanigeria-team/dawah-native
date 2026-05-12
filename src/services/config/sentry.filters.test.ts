import {
  isExpectedExpoUpdatesCheckFailure,
  shouldDropExpectedExpoUpdatesCheckEvent,
  shouldSendSentryEvent,
} from './sentry.filters';

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

describe('isExpectedExpoUpdatesCheckFailure', () => {
  test('matches Expo Updates check failures captured with check_for_update context', () => {
    const error = new Error(
      "Call to function 'ExpoUpdates.checkForUpdateAsync' has been rejected.\n" +
        'Caused by: Failed to check for update',
    );

    expect(isExpectedExpoUpdatesCheckFailure(error, { action: 'check_for_update' })).toBe(true);
  });

  test('does not match unrelated update failures', () => {
    expect(
      isExpectedExpoUpdatesCheckFailure(new Error('Failed to reload update'), {
        action: 'reload_after_update',
      }),
    ).toBe(false);
  });
});

describe('shouldDropExpectedExpoUpdatesCheckEvent', () => {
  test('drops Sentry events for Expo Updates check failures', () => {
    expect(
      shouldDropExpectedExpoUpdatesCheckEvent({
        exception: {
          values: [
            {
              type: 'Error',
              value:
                "Call to function 'ExpoUpdates.checkForUpdateAsync' has been rejected. " +
                'Caused by: Failed to check for update',
            },
          ],
        },
        extra: { action: 'check_for_update' },
      }),
    ).toBe(true);
  });

  test('keeps unrelated Sentry events', () => {
    expect(
      shouldDropExpectedExpoUpdatesCheckEvent({
        exception: {
          values: [{ type: 'Error', value: 'Something else failed' }],
        },
      }),
    ).toBe(false);
  });
});
