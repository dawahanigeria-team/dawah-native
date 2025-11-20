// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Get the default Expo Metro config with Sentry plugins
// Pass getDefaultConfig explicitly to avoid module resolution issues
const config = getSentryExpoConfig(__dirname, {
  getDefaultConfig,
});

module.exports = config;
