module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // MUST be the last plugin — transforms Reanimated worklets
      // so animations execute on the native UI thread instead of JS.
      'react-native-reanimated/plugin',
    ],
  };
};
