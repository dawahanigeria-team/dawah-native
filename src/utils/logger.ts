/**
 * Logger Utility
 * Provides environment-aware logging with automatic Sentry integration
 * Use this instead of console.log to avoid performance issues in production
 */

import { captureSentryException } from '../services/config/sentry.config';

const isDev = __DEV__;

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
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    console.error(message, error, context);

    // Send to Sentry in production
    if (!isDev && error) {
      captureSentryException(error, { message, ...context });
    }
  },
};
