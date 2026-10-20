import {
  isExpectedExpoUpdatesCheckFailure,
  isExpectedMissingAccessTokenFailure,
  isExpectedSocialSignInFailure,
  isExpectedUserInputRefusal,
  isExpectedUserInputRefusalFailure,
  isInvalidOrExpiredTokenMessage,
  scrubSensitiveBreadcrumb,
  scrubSensitiveExtras,
  shouldDropExpectedExpoUpdatesCheckEvent,
  shouldDropExpectedUserInputRefusalEvent,
  shouldDropExpectedMissingAccessTokenEvent,
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

  test('matches an update download that the connection dropped', () => {
    const error = new Error(
      "Call to function 'ExpoUpdates.fetchUpdateAsync' has been rejected.\n" +
        '→ Caused by: Failed to download new update',
    );

    expect(isExpectedExpoUpdatesCheckFailure(error, { action: 'check_for_update' })).toBe(true);
    expect(isExpectedExpoUpdatesCheckFailure(error)).toBe(true);
  });

  test('still reports a fetch failure that is not a download failure', () => {
    const error = new Error(
      "Call to function 'ExpoUpdates.fetchUpdateAsync' has been rejected.\n" +
        '→ Caused by: Update manifest is invalid',
    );

    expect(isExpectedExpoUpdatesCheckFailure(error)).toBe(false);
  });
});

describe('isExpectedSocialSignInFailure', () => {
  test('matches Google reporting that the device has no network', () => {
    expect(
      isExpectedSocialSignInFailure(new Error('NETWORK_ERROR'), { action: 'handleGoogleSignIn' }),
    ).toBe(true);
  });

  test('matches Apple failing for an unknown reason', () => {
    expect(
      isExpectedSocialSignInFailure(
        new Error('The authorization attempt failed for an unknown reason'),
        { action: 'handleAppleSignIn' },
      ),
    ).toBe(true);
  });

  test('only applies to the sign-in handlers', () => {
    expect(isExpectedSocialSignInFailure(new Error('NETWORK_ERROR'), { action: 'somethingElse' })).toBe(
      false,
    );
    expect(isExpectedSocialSignInFailure(new Error('NETWORK_ERROR'))).toBe(false);
  });

  test('still reports other sign-in failures', () => {
    expect(
      isExpectedSocialSignInFailure(new Error('DEVELOPER_ERROR'), { action: 'handleGoogleSignIn' }),
    ).toBe(false);
    expect(
      isExpectedSocialSignInFailure(new Error('NETWORK_ERROR'), { action: 'handleAppleSignIn' }),
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

describe('isExpectedMissingAccessTokenFailure', () => {
  test('matches expected API auth misses', () => {
    const error = Object.assign(new Error('Access token is required'), { statusCode: 401 });

    expect(isExpectedMissingAccessTokenFailure(error)).toBe(true);
    expect(
      isExpectedMissingAccessTokenFailure(new Error('Access token is required'), {
        statusCode: 401,
      }),
    ).toBe(true);
  });

  test('keeps unrelated API failures', () => {
    const error = Object.assign(new Error('Token expired'), { statusCode: 401 });

    expect(isExpectedMissingAccessTokenFailure(error)).toBe(false);
  });
});

describe('shouldDropExpectedMissingAccessTokenEvent', () => {
  test('drops Sentry events for expected API auth misses', () => {
    expect(
      shouldDropExpectedMissingAccessTokenEvent({
        exception: {
          values: [{ type: 'ApiError', value: 'Access token is required' }],
        },
        extra: { statusCode: 401 },
      }),
    ).toBe(true);
  });

  test('keeps missing access token text without a 401 status', () => {
    expect(
      shouldDropExpectedMissingAccessTokenEvent({
        exception: {
          values: [{ type: 'ApiError', value: 'Access token is required' }],
        },
      }),
    ).toBe(false);
  });
});

describe('isExpectedUserInputRefusal', () => {
  test('recognises the refusals users cause themselves', () => {
    expect(isExpectedUserInputRefusal(401, 'invalid email/username or password')).toBe(true);
    expect(isExpectedUserInputRefusal(409, 'user already exists')).toBe(true);
    expect(isExpectedUserInputRefusal('401', 'incorrect password')).toBe(true);
  });

  test('leaves real faults alone', () => {
    expect(isExpectedUserInputRefusal(500, 'internal server error')).toBe(false);
    expect(isExpectedUserInputRefusal(409, 'conflict updating playlist')).toBe(false);
    expect(isExpectedUserInputRefusal(403, 'user already exists')).toBe(false);
  });

  test('does not claim invalid-token 401s, which the API client decides', () => {
    expect(
      isExpectedUserInputRefusal(401, 'invalid or expired token: signature verification failed'),
    ).toBe(false);
  });
});

describe('isInvalidOrExpiredTokenMessage', () => {
  test('matches the wordings the backend uses', () => {
    expect(isInvalidOrExpiredTokenMessage('invalid or expired token: signature verification failed')).toBe(true);
    expect(isInvalidOrExpiredTokenMessage('token expired')).toBe(true);
  });

  test('ignores unrelated messages', () => {
    expect(isInvalidOrExpiredTokenMessage('internal server error')).toBe(false);
  });
});

describe('shouldDropExpectedUserInputRefusalEvent', () => {
  test('drops a duplicate-signup conflict', () => {
    expect(
      shouldDropExpectedUserInputRefusalEvent({
        extra: { statusCode: 409 },
        exception: { values: [{ type: 'ApiError', value: 'User already exists' }] },
      }),
    ).toBe(true);
  });

  test('keeps an invalid-token 401, so the client policy is not undone', () => {
    expect(
      shouldDropExpectedUserInputRefusalEvent({
        extra: { statusCode: 401 },
        exception: {
          values: [
            { type: 'ApiError', value: 'Invalid or expired token: Signature verification failed' },
          ],
        },
      }),
    ).toBe(false);
  });

  test('keeps a server fault that merely carries a status code', () => {
    expect(
      shouldDropExpectedUserInputRefusalEvent({
        extra: { statusCode: 500 },
        exception: { values: [{ type: 'ApiError', value: 'Internal Server Error' }] },
      }),
    ).toBe(false);
  });

  test('keeps an event with no status code at all', () => {
    expect(
      shouldDropExpectedUserInputRefusalEvent({
        exception: { values: [{ type: 'Error', value: 'User already exists' }] },
      }),
    ).toBe(false);
  });
});

describe('isExpectedUserInputRefusalFailure', () => {
  test('recognises a caught ApiError carrying its own status', () => {
    const wrongPassword = Object.assign(
      new Error('Invalid email/username or password'),
      { statusCode: 401 },
    );
    const duplicateSignup = Object.assign(new Error('User already exists'), { statusCode: 409 });

    expect(isExpectedUserInputRefusalFailure(wrongPassword, { operation: 'auth_login' })).toBe(true);
    expect(isExpectedUserInputRefusalFailure(duplicateSignup)).toBe(true);
  });

  test('keeps invalid-token 401s and failures without a status', () => {
    const invalidToken = Object.assign(
      new Error('Invalid or expired token: Signature verification failed'),
      { statusCode: 401 },
    );

    expect(isExpectedUserInputRefusalFailure(invalidToken)).toBe(false);
    expect(isExpectedUserInputRefusalFailure(new Error('User already exists'))).toBe(false);
    expect(isExpectedUserInputRefusalFailure(null)).toBe(false);
  });
});

describe('scrubSensitiveExtras', () => {
  test('filters what was typed into auth forms and keeps the rest', () => {
    const event = {
      extra: {
        email: 'someone@example.com',
        Username: 'someone',
        operation: 'auth_register',
        statusCode: 409,
      },
    };

    expect(scrubSensitiveExtras(event).extra).toEqual({
      email: '[Filtered]',
      Username: '[Filtered]',
      operation: 'auth_register',
      statusCode: 409,
    });
  });

  test('passes events without extras through', () => {
    const event: { message: string; extra?: Record<string, unknown> } = { message: 'boom' };

    expect(scrubSensitiveExtras(event)).toBe(event);
  });
});

describe('scrubSensitiveBreadcrumb', () => {
  test('filters a typed email carried in breadcrumb data and keeps the rest', () => {
    const breadcrumb = {
      message: 'Sign in failed',
      data: { email: 'someone@example.com', error: 'Invalid password' },
    };

    expect(scrubSensitiveBreadcrumb(breadcrumb).data).toEqual({
      email: '[Filtered]',
      error: 'Invalid password',
    });
  });

  test('passes breadcrumbs without data through', () => {
    const breadcrumb: { message: string; data?: Record<string, unknown> } = { message: 'tap' };

    expect(scrubSensitiveBreadcrumb(breadcrumb)).toBe(breadcrumb);
  });
});
