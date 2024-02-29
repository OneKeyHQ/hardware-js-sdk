/* eslint-disable @typescript-eslint/no-var-requires */
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize the config before returning it.
  config.resolve.fallback = {
    crypto: require.resolve('./shim/crypto'),
    stream: require.resolve('stream-browserify'),
    path: false,
    https: false,
    http: false,
    net: false,
    zlib: false,
    tls: false,
    child_process: false,
    process: false,
    fs: false,
    util: false,
    os: false,
    buffer: require.resolve('buffer/'),
  };

  // disable devtool in production
  if (process.env.NODE_ENV === 'production') {
    config.devtool = false;
  }

  return config;
};
