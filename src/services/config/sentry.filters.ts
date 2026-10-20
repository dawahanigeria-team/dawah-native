type ShouldSendSentryEventInput = {
  isDevelopment: boolean;
  devFlagValue?: string;
};

type EventLike = {
  message?: unknown;
  exception?: {
    values?: Array<{
      type?: unknown;
      value?: unknown;
    }>;
  };
  extra?: Record<string, unknown>;
};

const isDevSentryEnabled = (devFlagValue?: string): boolean => devFlagValue === 'true';

export const shouldSendSentryEvent = ({
  isDevelopment,
  devFlagValue,
}: ShouldSendSentryEventInput): boolean => {
  if (!isDevelopment) return true;
  return isDevSentryEnabled(devFlagValue);
};

const normalizeText = (value: unknown): string => (
  typeof value === 'string' ? value.toLowerCase() : ''
);

/**
 * expo-updates reports a dropped or timed-out connection to u.expo.dev or the
 * asset host as "Failed to download ..." with no cause attached, and a phone
 * on a weak network produces it constantly. Nothing in the app can act on it.
 */
const hasExpectedExpoUpdatesCheckText = (text: string): boolean => (
  (text.includes('expoupdates.checkforupdateasync') &&
    text.includes('failed to check for update')) ||
  (text.includes('expoupdates.fetchupdateasync') &&
    text.includes('failed to download'))
);

const hasMissingAccessTokenText = (text: string): boolean => (
  text.includes('access token') && text.includes('required')
);

export const isExpectedMissingAccessTokenFailure = (
  error: unknown,
  context?: Record<string, unknown>,
): boolean => {
  const maybeError = error as { message?: unknown; statusCode?: unknown } | null;
  const message = normalizeText(maybeError?.message);
  const statusCode = maybeError?.statusCode ?? context?.statusCode;

  return (
    (statusCode === 401 || statusCode === '401') &&
    hasMissingAccessTokenText(message)
  );
};

export const isExpectedExpoUpdatesCheckFailure = (
  error: unknown,
  context?: Record<string, unknown>,
): boolean => {
  const maybeError = error as { message?: unknown; code?: unknown } | null;
  const message = normalizeText(maybeError?.message);
  const code = normalizeText(maybeError?.code);
  const action = normalizeText(context?.action);

  return (
    hasExpectedExpoUpdatesCheckText(message) ||
    (
      action === 'check_for_update' &&
      (
        code === 'err_updates_check' ||
        message.includes('failed to check for update')
      )
    )
  );
};

/**
 * Platform sign-in sheets that failed for reasons outside the app: Google's
 * play-services reporting no network, and Apple's generic "unknown reason"
 * (no iCloud account on the device, a dismissed sheet). The user is told on
 * screen and nothing in our code can change the outcome.
 */
export const isExpectedSocialSignInFailure = (
  error: unknown,
  context?: Record<string, unknown>,
): boolean => {
  const action = normalizeText(context?.action);
  const message = normalizeText((error as { message?: unknown } | null)?.message);

  if (action === 'handlegooglesignin') return message.includes('network_error');
  if (action === 'handleapplesignin') {
    return message.includes('authorization attempt failed for an unknown reason');
  }
  return false;
};

export const shouldDropExpectedExpoUpdatesCheckEvent = (event: EventLike): boolean => {
  const eventMessage = normalizeText(event.message);
  if (hasExpectedExpoUpdatesCheckText(eventMessage)) {
    return true;
  }

  const action = normalizeText(event.extra?.action);
  const values = event.exception?.values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => {
    const type = normalizeText(value?.type);
    const message = normalizeText(value?.value);
    const combined = `${type} ${message}`;

    return (
      hasExpectedExpoUpdatesCheckText(combined) ||
      (
        action === 'check_for_update' &&
        message.includes('failed to check for update')
      )
    );
  });
};

export const shouldDropExpectedMissingAccessTokenEvent = (event: EventLike): boolean => {
  const statusCode = event.extra?.statusCode;
  if (statusCode !== 401 && statusCode !== '401') {
    return false;
  }

  const eventMessage = normalizeText(event.message);
  if (hasMissingAccessTokenText(eventMessage)) {
    return true;
  }

  const values = event.exception?.values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => {
    const type = normalizeText(value?.type);
    const message = normalizeText(value?.value);
    return type === 'apierror' && hasMissingAccessTokenText(message);
  });
};

const hasInvalidCredentialsText = (text: string): boolean => (
  text.includes('invalid email') ||
  text.includes('invalid username') ||
  (text.includes('invalid') && text.includes('password')) ||
  text.includes('incorrect password')
);

const hasAlreadyExistsText = (text: string): boolean => text.includes('already exists');

/**
 * The text an API failure carries, wherever the backend chose to put it.
 */
export const getApiErrorText = (errorData: unknown): string => {
  const maybeData = errorData as { message?: unknown; error?: unknown } | null;
  return normalizeText(maybeData?.message) || normalizeText(maybeData?.error);
};

/**
 * A token the server will not accept. Kept separate from the refusals below
 * because whether it is expected depends on *when* it happened, which only the
 * API client knows - see shouldCaptureApiHttpError.
 */
export const isInvalidOrExpiredTokenMessage = (text: string): boolean => (
  text.includes('signature verification failed') ||
  (text.includes('expired') && text.includes('token'))
);

/**
 * A refusal the user caused: a wrong password, a duplicate signup. The API is
 * working exactly as intended, and reporting these buries the failures that are
 * actually defects.
 */
export const isExpectedUserInputRefusal = (
  statusCode: unknown,
  errorText: string,
): boolean => {
  const status = typeof statusCode === 'string' ? Number(statusCode) : statusCode;

  if (status === 409) return hasAlreadyExistsText(errorText);
  if (status === 401) return hasInvalidCredentialsText(errorText);

  return false;
};

/**
 * The same refusals, re-reported by a caller that caught the ApiError (the
 * auth service and the sign-in/sign-up screens). The status lives on the error
 * rather than in extras, so the beforeSend check below never sees it.
 */
export const isExpectedUserInputRefusalFailure = (
  error: unknown,
  context?: Record<string, unknown>,
): boolean => {
  const maybeError = error as { message?: unknown; statusCode?: unknown } | null;
  const statusCode = maybeError?.statusCode ?? context?.statusCode;

  return isExpectedUserInputRefusal(statusCode, normalizeText(maybeError?.message));
};

const SENSITIVE_EXTRA_KEYS = new Set(['email', 'email_or_username', 'username', 'password']);

/**
 * What someone typed into an auth form is not ours to keep, and Sentry's
 * server-side scrubbing let `email` through.
 */
export const scrubSensitiveExtras = <T extends { extra?: Record<string, unknown> }>(event: T): T => {
  const extra = event.extra;
  if (!extra) return event;

  Object.keys(extra).forEach((key) => {
    if (SENSITIVE_EXTRA_KEYS.has(key.toLowerCase())) {
      extra[key] = '[Filtered]';
    }
  });
  return event;
};

const someExceptionText = (
  event: EventLike,
  predicate: (text: string) => boolean,
): boolean => {
  const values = event.exception?.values;
  if (!Array.isArray(values)) return false;
  return values.some(
    (value) => predicate(`${normalizeText(value?.type)} ${normalizeText(value?.value)}`),
  );
};

/**
 * Defence in depth for the refusals above, which the API client already
 * declines to report. Deliberately does NOT cover invalid-token 401s: the
 * client distinguishes an ended session from a token we should not have sent,
 * and dropping them here would undo that.
 */
export const shouldDropExpectedUserInputRefusalEvent = (event: EventLike): boolean => {
  const statusCode = event.extra?.statusCode;
  if (statusCode === undefined || statusCode === null) return false;

  const eventMessage = normalizeText(event.message);
  if (eventMessage && isExpectedUserInputRefusal(statusCode, eventMessage)) {
    return true;
  }

  return someExceptionText(event, (text) => isExpectedUserInputRefusal(statusCode, text));
};
