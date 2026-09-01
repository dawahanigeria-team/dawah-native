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
  // Android is excluded: mobile replay there has been the source of ANRs on the
  // low-end devices much of the audience uses.
  const enabled = platform !== "android";

  if (!enabled) {
    return {
      enabled: false,
      maskAllText: true,
      maskAllImages: true,
      sessionSampleRate: 0,
      onErrorSampleRate: 0,
    };
  }

  return {
    enabled: true,

    // Replay is for seeing the SHAPE of what happened — which screens, which
    // taps, in what order. Reading the content is not the point, and the
    // content is the user's: what they typed, and whatever account details were
    // on screen when it broke. Masked replays still show navigation and
    // interaction. These stay true.
    maskAllText: true,
    maskAllImages: true,

    // Continuous session capture is off in production. Recording a share of
    // every session end to end costs the user upload bandwidth on metered
    // mobile data and buys little that on-error replay does not already give.
    sessionSampleRate: isDevelopment ? 1.0 : 0.0,

    // On-error replay is the one worth paying for: it only uploads when
    // something actually broke, which is exactly when we need to see it.
    onErrorSampleRate: 1.0,
  };
};
