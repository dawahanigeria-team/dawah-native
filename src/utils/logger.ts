/**
 * Logger Utility
 * Provides environment-aware logging with automatic Sentry integration
 * Use this instead of console.log to avoid performance issues in production
 */

import { captureSentryException } from '../services/config/sentry.config';

const isDev = __DEV__;

const toError = (error: unknown): Error | undefined => {
  if (!error) return undefined;
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
};

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - only shown in development
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logs - shown in all environments
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error logs - shown in all environments and sent to Sentry in production
   */
  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    console.error(message, error, context);

    const normalizedError = toError(error);
    if (!normalizedError) {
      return;
    }

    const telemetryContext = { message, ...context };

    // Sentry is the only error destination now.
    if (!isDev) {
      captureSentryException(normalizedError, telemetryContext, {
      });
    }
  },
};
