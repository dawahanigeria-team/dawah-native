/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  isCancelledErrorText,
  isCancelledRequestError,
  isTransientNetworkError,
  isTransientNetworkErrorText,
} from "../api/networkErrors";
import { capturePostHogException } from "./posthog.config";
import {
  isExpectedExpoUpdatesCheckFailure,
  isExpectedMissingAccessTokenFailure,
  shouldDropExpectedExpoUpdatesCheckEvent,
  shouldDropExpectedMissingAccessTokenEvent,
  shouldSendSentryEvent,
} from "./sentry.filters";

const SENTRY_DSN =
  "https://d2bf75e91c09153b4afbb0da6f7a5419@o980827.ingest.us.sentry.io/4511160608292864";

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value === "true";
};

const isBenignNetworkOrCancellationError = (error: unknown): boolean => {
  const maybeError = error as {
    isCancelled?: boolean;
    isNetworkError?: boolean;
  } | null;

  if (maybeError?.isCancelled === true) return true;
  if (maybeError?.isNetworkError === true) return true;
  if (isCancelledRequestError(error)) return true;
  if (isTransientNetworkError(error)) return true;

  return false;
};

const shouldDropEventAsNetworkNoise = (event: Sentry.Event): boolean => {
  const message = typeof event.message === "string" ? event.message : "";
  if (isCancelledErrorText(message) || isTransientNetworkErrorText(message)) {
    return true;
  }

  const values = event.exception?.values;
  if (!Array.isArray(values)) {
    return false;
  }

  return values.some((value) => {
    const type = typeof value?.type === "string" ? value.type : "";
    const message = typeof value?.value === "string" ? value.value : "";
    return (
      isCancelledErrorText(type) ||
      isCancelledErrorText(message) ||
      isTransientNetworkErrorText(type) ||
      isTransientNetworkErrorText(message)
    );
  });
};

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initSentry = () => {
  // Only initialize in React Native environment
  if (typeof window === "undefined") {
    console.warn("Sentry: Skipping initialization in Node.js environment");
    return;
  }

  const isDevelopment = __DEV__;
  const devSentryFlagValue = process.env.EXPO_PUBLIC_SENTRY_DEV_ENABLED;
  const environment = isDevelopment ? "development" : "production";
  const sendSentryEvents = shouldSendSentryEvent({
    isDevelopment,
    devFlagValue: devSentryFlagValue,
  });
  const captureSentryLogs = parseBoolean(
    process.env.EXPO_PUBLIC_SENTRY_CAPTURE_LOGS,
    false,
  );
  const enableSentryLogs = parseBoolean(
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_LOGS,
    false,
  );
  const enableSentryMetrics = parseBoolean(
    process.env.EXPO_PUBLIC_SENTRY_ENABLE_METRICS,
    true,
  );
  const tracesSampleRate = parseSampleRate(
    process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    isDevelopment ? 1 : 0.2,
  );
  const profilesSampleRate = parseSampleRate(
    process.env.EXPO_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE,
    0,
  );
  const tracingEnabled = tracesSampleRate > 0;
  const enableMobileReplay = Platform.OS !== "android";
  const replaySessionSampleRate = enableMobileReplay
    ? isDevelopment
      ? 1.0
      : 0.1
    : 0.0;
  const replayOnErrorSampleRate = enableMobileReplay ? 1.0 : 0.0;
  // Keep fatal flush waits short on Android to reduce ANR risk on low-end devices.
  const shutdownTimeout = Platform.OS === "android" ? 1000 : 2000;
  const integrations = [
    ...(enableMobileReplay
      ? [
          Sentry.mobileReplayIntegration({
            maskAllText: false,
            maskAllImages: false,
          }),
        ]
      : []),
    ...(tracingEnabled ? [Sentry.reactNativeTracingIntegration()] : []),
  ];

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment and release tracking
    environment,
    release: `dawah-nigeria@${Constants.expoConfig?.version || "1.0.0"}`,
    dist: String(
      Constants.expoConfig?.ios?.buildNumber ||
        Constants.expoConfig?.android?.versionCode ||
        1,
    ),

    // Enable debug mode in development (set to false to reduce console noise)
    debug: false, // Change to true if you need to debug Sentry itself

    // Enable sending default PII (Personally Identifiable Information)
    // Set to false if you need to comply with strict privacy regulations
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,

    // Performance Monitoring
    tracesSampleRate,

    // Profiling
    profilesSampleRate,

    // Session Replay
    replaysOnErrorSampleRate: replayOnErrorSampleRate,
    replaysSessionSampleRate: replaySessionSampleRate,

    // Structured logs and custom metrics
    enableLogs: enableSentryLogs,
    enableMetrics: enableSentryMetrics,

    // User Interaction Tracing (button taps, scrolls, etc.)
    enableUserInteractionTracing: tracingEnabled,

    // Integrations
    integrations,

    // Before sending events
    beforeSend(event) {
      if (!sendSentryEvents) {
        return null;
      }
      // Keep Sentry focused on actionable errors unless explicitly enabled.
      if (
        !captureSentryLogs &&
        !event.exception &&
        event.level !== "fatal" &&
        event.level !== "error"
      ) {
        return null;
      }
      if (shouldDropEventAsNetworkNoise(event)) {
        return null;
      }
      if (shouldDropExpectedExpoUpdatesCheckEvent(event)) {
        return null;
      }
      if (shouldDropExpectedMissingAccessTokenEvent(event)) {
        return null;
      }
      return event;
    },

    beforeSendTransaction(transaction) {
      if (!sendSentryEvents || !tracingEnabled) {
        return null;
      }
      return transaction;
    },

    // Before sending breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Filter sensitive breadcrumbs
      if (breadcrumb.category === "console") {
        return null; // Don't send console logs as breadcrumbs
      }
      return breadcrumb;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Network errors that are expected
      "Network request failed",
      "NetworkError",
      "Failed to fetch",

      // React Native specific
      "Aborted",
      "AbortError",
      "cancelled",
      "canceled",
      "Fetch request has been canceled",
      "Request cancelled",
      "Request canceled",
      "Read error: ssl=",
      "I/O error during system call",
      "Software caused connection abort",
      "Download failed",
      "Unable to resolve host",
      "Connection reset",
      "Unexpected end of stream",
      "Broken pipe",

      // Expo specific
      "ExpoModulesCore",
    ],

    // Enable native crash handling
    enableNativeCrashHandling: true,
    enableNative: true,

    // Enable auto performance tracking
    enableAutoPerformanceTracing: tracingEnabled,

    // Maximum number of breadcrumbs
    maxBreadcrumbs: 100,

    // Attach stack trace to messages
    attachStacktrace: true,

    // Controls the fatal flush wait in ReactNativeErrorHandlers.
    shutdownTimeout,
  });

  // Set user context if available (can be updated later with actual user data)
  Sentry.setContext("device", {
    platform: Constants.platform,
    deviceName: Constants.deviceName,
    expoVersion: Constants.expoVersion,
  });

  console.warn("Sentry initialized:", {
    environment,
    dsn: `${SENTRY_DSN.substring(0, 50)}...`,
    debug: isDevelopment,
    sendEvents: sendSentryEvents,
    captureLogs: captureSentryLogs,
    enableLogs: enableSentryLogs,
    enableMetrics: enableSentryMetrics,
    tracesSampleRate,
    profilesSampleRate,
  });

  if (isDevelopment && !sendSentryEvents) {
    console.warn(
      "Sentry dev events are disabled. Set EXPO_PUBLIC_SENTRY_DEV_ENABLED=true to send events locally.",
    );
  }
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
export const setSentryContext = (
  key: string,
  context: Record<string, unknown>,
) => {
  Sentry.setContext(key, context);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addSentryBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>,
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: "info",
    data,
  });
};

/**
 * Manually capture an exception
 */
export const captureSentryException = (
  error: Error,
  context?: Record<string, unknown>,
  options?: {
    alsoSendToPostHog?: boolean;
    captureClientError?: boolean;
  },
) => {
  const alsoSendToPostHog = options?.alsoSendToPostHog ?? true;
  const captureClientError =
    options?.captureClientError ??
    parseBoolean(process.env.EXPO_PUBLIC_SENTRY_CAPTURE_CLIENT_ERRORS, true);

  if (isBenignNetworkOrCancellationError(error)) {
    return;
  }
  if (isExpectedExpoUpdatesCheckFailure(error, context)) {
    return;
  }
  if (isExpectedMissingAccessTokenFailure(error, context)) {
    return;
  }
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  if (
    statusCode &&
    statusCode >= 400 &&
    statusCode < 500 &&
    !captureClientError
  ) {
    return;
  }

  // Send to PostHog error tracking in parallel
  if (alsoSendToPostHog) {
    capturePostHogException(error, context);
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
export const captureSentryMessage = (
  message: string,
  level: Sentry.SeverityLevel = "info",
) => {
  Sentry.captureMessage(message, level);
};

/**
 * Export Sentry for direct use
 */
export { Sentry };
