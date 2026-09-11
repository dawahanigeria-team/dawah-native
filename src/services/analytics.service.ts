import * as Application from "expo-application";
import { Observe } from "expo-observe";
import { AppState, Platform, type AppStateStatus } from "react-native";

export type AnalyticsEvent =
  | "app_opened"
  | "app_session"
  | "lecture_played"
  | "lecture_paused"
  | "lecture_completed"
  | "search_performed"
  | "download_started"
  | "download_completed"
  | "subscription_checkout_started"
  | "subscription_activated";

type Properties = Record<string, string | number | boolean | null | undefined>;

const commonProperties = {
  app: "native",
  platform: Platform.OS,
  app_version: Application.nativeApplicationVersion ?? "unknown",
  build_number: Application.nativeBuildVersion ?? "unknown",
};

/**
 * Product analytics is dispatched through EAS Observe.
 *
 * PostHog was removed: it shipped its own error tracking alongside Sentry's, so
 * every crash was reported twice, and it carried a session recorder and remote
 * config the app never used. Sentry keeps the errors.
 *
 * The event names and the properties attached to them are unchanged from that
 * era, so nothing at the call sites had to move. Observe records these against
 * the same session as the startup and per-route timings, which is the reason to
 * put them here rather than anywhere else: a slow launch and what the user did
 * about it are on one timeline.
 *
 * Volume is governed by `sampleRate` in `config/observe.config.ts`, not here —
 * sampling is per installation, so a sampled-in device reports every event and
 * a sampled-out device reports none. Half a session is not worth reading.
 */

/**
 * Observe's attribute values are strings, numbers, booleans, and nested
 * structures of those. `null` and `undefined` are not among them and are
 * dropped downstream, so an absent property is left out rather than sent as an
 * empty one — `lecturer_id: null` would otherwise read as a real value.
 */
const toAttributes = (properties: Properties): Record<string, string | number | boolean> => {
  const attributes: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined) continue;
    attributes[key] = value;
  }
  return attributes;
};

const capture = (event: AnalyticsEvent, properties: Properties = {}) => {
  if (__DEV__) {
    console.log("[analytics]", event, { ...commonProperties, ...properties });
  }

  Observe.logEvent(event, {
    attributes: toAttributes({ ...commonProperties, ...properties }),
    severity: "info",
  });
};

const trackAppSession = () => {
  let appState: AppStateStatus = AppState.currentState;
  let activeStartedAt = appState === "active" ? Date.now() : null;

  const finishActivePeriod = () => {
    if (activeStartedAt === null) return;
    const activeSeconds = Math.max(1, Math.round((Date.now() - activeStartedAt) / 1000));
    capture("app_session", { active_seconds: activeSeconds });
    activeStartedAt = null;
  };

  const subscription = AppState.addEventListener("change", (nextState) => {
    if (appState === "active" && nextState !== "active") {
      finishActivePeriod();
    } else if (appState !== "active" && nextState === "active") {
      activeStartedAt = Date.now();
    }
    appState = nextState;
  });

  return () => {
    finishActivePeriod();
    subscription.remove();
  };
};

export const analytics = {
  capture,
  trackAppSession,
};
