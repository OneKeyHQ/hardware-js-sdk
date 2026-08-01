/* eslint-disable @typescript-eslint/no-var-requires */
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer/'),
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
  process: require.resolve('process/browser'),
  events: require.resolve('events/'),
  http: require.resolve('http-browserify'),
  https: require.resolve('https-browserify'),
  zlib: require.resolve('browserify-zlib'),
  util: require.resolve('util/'),
  url: require.resolve('url/'),
  path: require.resolve('path-browserify'),
};

// Enable package exports to allow resolving subpath imports like '@noble/hashes/blake2b'
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
