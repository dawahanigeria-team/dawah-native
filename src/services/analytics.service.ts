import * as Application from "expo-application";
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
 * Product analytics has no transport at the moment.
 *
 * PostHog was removed: it shipped its own error tracking alongside Sentry's, so
 * every crash was reported twice, and it carried a session recorder and remote
 * config the app never used. Sentry keeps the errors.
 *
 * The event names and the properties attached to them are deliberately left in
 * place, and every call site still calls through here. Restoring analytics means
 * giving this one function a destination — `expo-observe` (EAS Observe) being the
 * obvious candidate on SDK 57 — not re-instrumenting the app.
 */
const capture = (event: AnalyticsEvent, properties: Properties = {}) => {
  if (!__DEV__) return;
  console.log("[analytics]", event, { ...commonProperties, ...properties });
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
