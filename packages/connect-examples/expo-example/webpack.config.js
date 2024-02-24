/* eslint-disable @typescript-eslint/no-var-requires */
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize the config before returning it.
  if (config.resolve.alias) {
    config.resolve.alias.stream = 'stream-browserify';
    config.resolve.alias.crypto = 'react-native-crypto';
    config.resolve.alias.fs = 'react-native-level-fs';
    config.resolve.alias.path = 'path-browserify';
  } else {
    config.resolve.alias = {
      stream: 'stream-browserify',
      crypto: 'react-native-crypto',
      fs: 'react-native-level-fs',
      path: 'path-browserify',
    };
  }

  // disable devtool in production
  if (process.env.NODE_ENV === 'production') {
    config.devtool = false;
  }

  return config;
};
