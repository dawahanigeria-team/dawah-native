type ErrorWithContext = {
  message?: unknown;
  name?: unknown;
  code?: unknown;
};

const CANCELLED_ERROR_PATTERNS: RegExp[] = [
  /\bfetch request has been canceled\b/i,
  /\brequest(?: has been)? cancell?ed\b/i,
  /\boperation was abort(?:ed)?\b/i,
  /\baborterror\b/i,
  /\berr_canceled\b/i,
];

const TRANSIENT_NETWORK_ERROR_PATTERNS: RegExp[] = [
  /\bnetwork request failed\b/i,
  /\bfailed to fetch\b/i,
  /\bread error:\s*ssl=/i,
  /\bi\/o error during system call\b/i,
  /\bsoftware caused connection abort\b/i,
  /\bdownload failed\b/i,
  /\bthe network connection was lost\b/i,
  /\bconnection (?:reset|abort(?:ed)?|closed)\b/i,
  /\bunable to resolve host\b/i,
  /\bfailed to connect to\b/i,
  /\bunexpected end of stream\b/i,
  /\bbroken pipe\b/i,
  /\beconn(?:aborted|reset|refused)\b/i,
];

const normalizeText = (value?: string | null): string => {
  if (!value) return '';
  return value.trim();
};

const collectErrorText = (error: unknown): string[] => {
  if (typeof error === 'string') {
    return [error];
  }

  if (!error || typeof error !== 'object') {
    return [];
  }

  const maybeError = error as ErrorWithContext;
  const values = [maybeError.name, maybeError.message, maybeError.code];

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
};

const matchesAnyPattern = (value: string, patterns: RegExp[]): boolean => {
  if (!value) return false;
  return patterns.some((pattern) => pattern.test(value));
};

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const maybeError = error as ErrorWithContext;
    if (typeof maybeError.message === 'string') return maybeError.message;
  }
  return String(error ?? 'Unknown error');
};

export const isCancelledErrorText = (value?: string | null): boolean => {
  const normalized = normalizeText(value);
  return matchesAnyPattern(normalized, CANCELLED_ERROR_PATTERNS);
};

export const isTransientNetworkErrorText = (value?: string | null): boolean => {
  const normalized = normalizeText(value);
  return matchesAnyPattern(normalized, TRANSIENT_NETWORK_ERROR_PATTERNS);
};

export const isCancelledRequestError = (error: unknown): boolean => {
  const textParts = collectErrorText(error);
  return textParts.some((text) => isCancelledErrorText(text));
};

export const isTransientNetworkError = (error: unknown): boolean => {
  if (isCancelledRequestError(error)) {
    return false;
  }
  const textParts = collectErrorText(error);
  return textParts.some((text) => isTransientNetworkErrorText(text));
};
