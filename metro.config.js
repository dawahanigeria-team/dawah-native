// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Get the default Expo Metro config with Sentry plugins
// Pass getDefaultConfig explicitly to avoid module resolution issues
const config = getSentryExpoConfig(__dirname, {
  getDefaultConfig,
  // Drop Sentry's WEB Session Replay from the bundle. It is dead weight here:
  // replay on this app is the native mobileReplayIntegration, and the web
  // implementation is only reachable from a browser build.
  //
  // It is opt-out and defaults to on, so this has to be said explicitly — the
  // resolver that strips it is only installed when this is literally false.
  includeWebReplay: false,
});

// Enable inline requires to improve startup time by lazily requiring modules
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      inlineRequires: true,
    },
  }),
};

// Add wasm to asset extensions for expo-sqlite web support
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver?.assetExts || []), 'wasm'],
};

module.exports = config;
