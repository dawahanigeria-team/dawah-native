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

const hasExpectedExpoUpdatesCheckText = (text: string): boolean => (
  text.includes('expoupdates.checkforupdateasync') &&
  text.includes('failed to check for update')
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
