/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = 'https://fa9ba76768be824dd073b24308221777@o4508901298929664.ingest.us.sentry.io/4509860969512960';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  // Only initialize in React Native environment
  if (typeof window === 'undefined') {
    console.log('⚠️ Sentry: Skipping initialization in Node.js environment');
    return;
  }

  const isDevelopment = __DEV__;
  const environment = isDevelopment ? 'development' : 'production';

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment and release tracking
    environment,
    release: `dawah-nigeria@${Constants.expoConfig?.version || '1.0.0'}`,
    dist: String(Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 1),

    // Enable debug mode in development (set to false to reduce console noise)
    debug: false, // Change to true if you need to debug Sentry itself

    // Enable sending default PII (Personally Identifiable Information)
    // Set to false if you need to comply with strict privacy regulations
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,

    // Performance Monitoring
    tracesSampleRate: isDevelopment ? 1.0 : 0.2, // 100% in dev, 20% in production

    // Profiling
    profilesSampleRate: isDevelopment ? 1.0 : 0.1, // 100% in dev, 10% in production

    // Session Replay
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    replaysSessionSampleRate: isDevelopment ? 1.0 : 0.1, // 100% in dev, 10% in production

    // User Interaction Tracing (button taps, scrolls, etc.)
    enableUserInteractionTracing: true,

    // Integrations
    integrations: [
      // Mobile Session Replay
      Sentry.mobileReplayIntegration({
        maskAllText: false,
        maskAllImages: false,
      }),

      // React Native tracing integration for performance monitoring
      Sentry.reactNativeTracingIntegration(),
    ],

    // Before sending events
    beforeSend(event) {
      // Filter out errors in development if needed
      if (isDevelopment) {
        console.log('🔍 Sentry Event:', event);
      }

      // Don't send events in development if you prefer
      // return isDevelopment ? null : event;

      return event;
    },

    // Before sending breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive breadcrumbs
      if (breadcrumb.category === 'console') {
        return null; // Don't send console logs as breadcrumbs
      }
      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Network errors that are expected
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // React Native specific
      'Aborted',
      'cancelled',

      // Expo specific
      'ExpoModulesCore',
    ],

    // Enable native crash handling
    enableNativeCrashHandling: true,
    enableNative: true,

    // Enable auto performance tracking
    enableAutoPerformanceTracing: true,

    // Maximum number of breadcrumbs
    maxBreadcrumbs: 100,

    // Attach stack trace to messages
    attachStacktrace: true,
  });

  // Set user context if available (can be updated later with actual user data)
  Sentry.setContext('device', {
    platform: Constants.platform,
    deviceName: Constants.deviceName,
    expoVersion: Constants.expoVersion,
  });

  console.log('✅ Sentry initialized:', {
    environment,
    dsn: SENTRY_DSN.substring(0, 50) + '...',
    debug: isDevelopment,
  });
};

/**
 * Set user information for error tracking
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

/**
 * Clear user information (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context to error reports
 */
export const setSentryContext = (key: string, context: Record<string, any>) => {
  Sentry.setContext(key, context);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addSentryBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
};

/**
 * Manually capture an exception
 */
export const captureSentryException = (error: Error, context?: Record<string, any>) => {
  const maybeCancelled = (error as { isCancelled?: boolean } | null)?.isCancelled;
  if (maybeCancelled) {
    return;
  }
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return;
  }
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message
 */
export const captureSentryMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Export Sentry for direct use
 */
export { Sentry };
