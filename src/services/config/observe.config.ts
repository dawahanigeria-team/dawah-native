/**
 * EAS Observe configuration.
 *
 * Observe answers a question Sentry does not: not "what broke" but "how slow is
 * it, on the devices people actually have". Startup, per-route time to
 * interactive, frame drops, memory, and EAS Update download times, attributed
 * to the build or update that changed them.
 *
 * The two live side by side on purpose. Sentry keeps native crashes, which
 * Observe does not capture; Observe keeps performance, which Sentry only
 * samples at 20%.
 *
 * The decision-making is a pure function so it can be tested without a native
 * module, in the same spirit as `sentry.replay.ts`.
 */

import { Observe, type ObserveConfig } from "expo-observe";
import * as Updates from "expo-updates";

/**
 * Route and query parameters that must never leave the device.
 *
 * The expo-router integration exports `routeParams` with every navigation
 * metric. `/reset-password?email=...` carries a real address and `/search?q=...`
 * carries whatever the user typed. Filtering a param also replaces the resolved
 * path with `urlHidden: true`, but `routeName` survives — so "/search was slow"
 * is still answerable without knowing what was searched for.
 */
export const FILTERED_ROUTE_PARAMS = ["email", "q", "token", "code", "password"];

export interface ObserveEnvironment {
  /** `__DEV__` */
  isDevelopment: boolean;
  /** `Updates.channel` — null in Expo Go and development builds. */
  channel: string | null;
  /** Raw `EXPO_PUBLIC_OBSERVE_SAMPLE_RATE`. */
  sampleRateValue: string | undefined;
  /** Raw `EXPO_PUBLIC_OBSERVE_ENABLED`. */
  enabledValue: string | undefined;
  /** Raw `EXPO_PUBLIC_OBSERVE_DISPATCH_IN_DEBUG`. */
  dispatchInDebugValue: string | undefined;
}

/**
 * Production default. Sampling is per installation and deterministic, so a
 * quarter of devices report complete sessions rather than every device
 * reporting fragments.
 *
 * Kept at a quarter because the free tier is 100k events/month and the router
 * integration spends one event per screen change. Raise it through the
 * environment variable once real volume is known — that needs an OTA, not a
 * store release.
 */
export const DEFAULT_PRODUCTION_SAMPLE_RATE = 0.25;

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

/**
 * The environment label Observe groups metrics under.
 *
 * `Updates.channel` rather than `NODE_ENV`, because a preview build is a
 * release build: to `NODE_ENV` it is indistinguishable from production, and its
 * numbers would be averaged into the production dashboard by a handful of
 * internal testers on developer-grade phones.
 */
export const resolveEnvironment = ({
  isDevelopment,
  channel,
}: Pick<ObserveEnvironment, "isDevelopment" | "channel">): string => {
  if (channel) return channel;
  return isDevelopment ? "development" : "production";
};

export const buildObserveConfig = (env: ObserveEnvironment): ObserveConfig => {
  const environment = resolveEnvironment(env);

  // Sampling only makes sense where the population is large. Preview and
  // development builds run on a countable number of devices, and dropping
  // three quarters of those would leave nothing to look at.
  const sampleRate =
    environment === "production"
      ? parseSampleRate(env.sampleRateValue, DEFAULT_PRODUCTION_SAMPLE_RATE)
      : 1;

  return {
    environment,
    dispatchingEnabled: parseBoolean(env.enabledValue, true),

    // Metro-served debug builds produce startup times that describe the
    // bundler, not the app. Flip the variable on when verifying the wiring.
    dispatchInDebug: parseBoolean(env.dispatchInDebugValue, false),

    sampleRate,

    integrations: {
      "expo-router": { filteredParams: FILTERED_ROUTE_PARAMS },
    },
  };
};

/**
 * Must run before `ObserveRoot` mounts. The router integration reads the
 * config once at mount and throws if it changes afterwards, so this belongs at
 * module scope in the root layout, next to `initSentry()`.
 */
export const initObserve = (): void => {
  Observe.configure(
    buildObserveConfig({
      isDevelopment: __DEV__,
      channel: Updates.channel,
      sampleRateValue: process.env.EXPO_PUBLIC_OBSERVE_SAMPLE_RATE,
      enabledValue: process.env.EXPO_PUBLIC_OBSERVE_ENABLED,
      dispatchInDebugValue: process.env.EXPO_PUBLIC_OBSERVE_DISPATCH_IN_DEBUG,
    }),
  );
};

/**
 * Attributes merged into every subsequent metric and event.
 *
 * Signed-in and guest users exercise different code paths — six pages once
 * crashed for signed-in users only — so a startup number that averages the two
 * hides the thing worth finding.
 *
 * `setGlobalAttributes` REPLACES the whole attribute map rather than merging
 * into it, so this function is the single owner of it. To add another global
 * attribute, widen this signature — calling `Observe.setGlobalAttributes`
 * anywhere else would silently drop `auth_state` from every later event.
 */
export const setObserveAudience = (attributes: {
  authState: "guest" | "signed_in";
}): void => {
  Observe.setGlobalAttributes({ auth_state: attributes.authState });
};
