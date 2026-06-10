module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be listed last — transforms worklet function bodies.
      'react-native-worklets/plugin',
    ],
  };
};
