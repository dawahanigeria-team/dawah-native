import { GoogleSignin } from "@react-native-google-signin/google-signin";

import { ENV } from "../config/env";

let isGoogleSigninConfigured = false;

export const ensureGoogleSigninConfigured = (): void => {
  if (isGoogleSigninConfigured) {
    return;
  }

  const webClientId = ENV.GOOGLE_WEB_CLIENT_ID.trim();
  const iosClientId = ENV.GOOGLE_IOS_CLIENT_ID.trim();

  if (!webClientId) {
    throw new Error("Google Sign-In is not configured for this build.");
  }

  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
  });

  isGoogleSigninConfigured = true;
};

export const resetGoogleSigninConfigurationForTests = (): void => {
  isGoogleSigninConfigured = false;
};
