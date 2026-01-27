// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Get the default Expo Metro config with Sentry plugins
// Pass getDefaultConfig explicitly to avoid module resolution issues
const config = getSentryExpoConfig(__dirname, {
  getDefaultConfig,
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
