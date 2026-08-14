/**
 * Environment configuration
 * Centralizes all environment variables access
 */

interface EnvConfig {
  API_BASE_URL: string;
  API_PROJECT_KEY: string;
  MEDIA_BASE_URL: string;
  MEDIA_HAS_MEDIUM: boolean;
  PUSH_NOTIFICATIONS_REGISTER_URL: string;
  POSTHOG_KEY: string;
  POSTHOG_HOST: string;
  GOOGLE_WEB_CLIENT_ID: string;
  GOOGLE_IOS_CLIENT_ID: string;
  PREMIUM_MONTHLY_PRODUCT_ID: string;
  PREMIUM_YEARLY_PRODUCT_ID: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

// Expo requires static access to environment variables, not dynamic
export const ENV: EnvConfig = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.dawahnigeria.com',
  API_PROJECT_KEY: process.env.EXPO_PUBLIC_API_PROJECT_KEY || '206cf92c-8a46-45ef-bf3f-a6ef92fc6f25',
  MEDIA_BASE_URL: process.env.EXPO_PUBLIC_MEDIA_BASE_URL || 'https://media.dawahnigeria.com',
  // Whether /dnimages/medium/ derivatives have been generated on the media
  // server. Defaults to false: see imageUrl.ts for why requesting a variant
  // before it exists is worse than serving an oversized one.
  MEDIA_HAS_MEDIUM: process.env.EXPO_PUBLIC_MEDIA_HAS_MEDIUM === 'true',
  PUSH_NOTIFICATIONS_REGISTER_URL: process.env.EXPO_PUBLIC_PUSH_REGISTER_URL || '',
  POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY || '',
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  // Fallbacks, not just defaults. EXPO_PUBLIC_* values are inlined into the JS
  // bundle when it is built, so an OTA published without the environment
  // loaded ships an empty string here — and ensureGoogleSigninConfigured then
  // throws "Google Sign-In is not configured for this build" for every user
  // who takes that update. That happened on the 1.0.0 production channel.
  //
  // These are OAuth *client* ids, not secrets: they are public by design and
  // already committed in eas.json and in app.json's iosUrlScheme. Hardcoding
  // them costs nothing and removes a whole class of outage.
  GOOGLE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '739832430566-5prajbumn1so6557o1f95cgslutmaqum.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    '739832430566-i4h4ftr4hedrg6anghbv2bnvvdlgrvus.apps.googleusercontent.com',
  PREMIUM_MONTHLY_PRODUCT_ID: process.env.EXPO_PUBLIC_PREMIUM_MONTHLY_PRODUCT_ID || 'dawahnigeria_premium_monthly',
  PREMIUM_YEARLY_PRODUCT_ID: process.env.EXPO_PUBLIC_PREMIUM_YEARLY_PRODUCT_ID || 'dawahnigeria_premium_yearly',
  NODE_ENV: (__DEV__ ? 'development' : 'production') as EnvConfig['NODE_ENV'],
};

export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

if (__DEV__) {
  console.log('Environment Configuration:', {
    API_BASE_URL: ENV.API_BASE_URL,
    MEDIA_BASE_URL: ENV.MEDIA_BASE_URL,
    NODE_ENV: ENV.NODE_ENV,
  });
}
