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

let googleSignInPending = false;

/** Cancellation is a normal result in the current Google SDK, not an error. */
export const signInWithGoogle = async () => {
  // Repeated taps must not overwrite the native SDK's pending promise or
  // perform two backend logins. The first caller owns the interactive flow.
  if (googleSignInPending) return null;
  googleSignInPending = true;
  try {
    ensureGoogleSigninConfigured();
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (response.type === "cancelled") return null;

    // Some devices return the user before the ID token. Ask the SDK for its
    // current tokens only after a successful interactive sign-in.
    const idToken = response.data.idToken || (await GoogleSignin.getTokens()).idToken;
    if (!idToken) throw new Error("No ID token received from Google");
    return {
      identityToken: idToken,
      email: response.data.user.email || null,
      fullName: response.data.user.name || null,
    };
  } finally {
    googleSignInPending = false;
  }
};
