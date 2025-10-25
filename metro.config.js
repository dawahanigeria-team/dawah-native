// Learn more https://docs.expo.io/guides/customizing-metro
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Get the default config from @sentry/react-native/metro
const config = getSentryExpoConfig(__dirname);

module.exports = config;
