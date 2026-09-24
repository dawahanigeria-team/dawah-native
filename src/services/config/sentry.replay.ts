/**
 * Session Replay settings, kept as pure logic so the privacy-relevant parts are
 * testable without booting Sentry.
 *
 * Two decisions live here, both of which were previously set as if the user's
 * screen and the user's data plan were free.
 */

export interface ReplayEnvironment {
  /** `Platform.OS` */
  platform: string;
  isDevelopment: boolean;
}

export interface ReplayOptions {
  enabled: boolean;
  /** Passed to Sentry.mobileReplayIntegration. */
  maskAllText: boolean;
  maskAllImages: boolean;
  /** Fraction of ALL sessions recorded end to end and uploaded. */
  sessionSampleRate: number;
  /** Fraction of sessions uploaded when an error occurs. */
  onErrorSampleRate: number;
}

export const buildReplayOptions = ({
  platform,
  isDevelopment,
}: ReplayEnvironment): ReplayOptions => {
  // Production events 3Q and 36 block inside Sentry's screenshot renderer.
  // Error-only replay still captures a rolling buffer before an error occurs.
  // Disable the integration and BOTH rates so monitoring cannot stall playback.
  const enabled = isDevelopment && platform === "ios";
  return {
    enabled,
    maskAllText: true,
    maskAllImages: true,
    sessionSampleRate: enabled ? 1 : 0,
    onErrorSampleRate: enabled ? 1 : 0,
  };
};
