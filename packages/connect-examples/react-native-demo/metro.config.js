/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');
const localPackage = packagePath => path.join(workspaceRoot, packagePath);
const packageRoot = name => path.dirname(require.resolve(`${name}/package.json`));

const localOneKeyPackages = {
  '@onekeyfe/hd-ble-sdk': localPackage('packages/hd-ble-sdk'),
  '@onekeyfe/hd-core': localPackage('packages/core'),
  '@onekeyfe/hd-shared': localPackage('packages/shared'),
  '@onekeyfe/hd-transport': localPackage('packages/hd-transport'),
  '@onekeyfe/hd-transport-react-native': localPackage('packages/hd-transport-react-native'),
};

const config = getDefaultConfig(projectRoot);
const defaultResolveRequest = config.resolver.resolveRequest;

const sourceEntryPoints = {
  '@onekeyfe/hd-ble-sdk': localPackage('packages/hd-ble-sdk/src/index.ts'),
  '@onekeyfe/hd-core': localPackage('packages/core/src/index.ts'),
  '@onekeyfe/hd-shared': localPackage('packages/shared/src/index.ts'),
  '@onekeyfe/hd-transport': localPackage('packages/hd-transport/src/index.ts'),
  '@onekeyfe/hd-transport-react-native': localPackage(
    'packages/hd-transport-react-native/src/index.ts'
  ),
};

config.watchFolders = [...(config.watchFolders || []), ...Object.values(localOneKeyPackages)];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];
config.resolver.assetExts = Array.from(new Set([...(config.resolver.assetExts || []), 'bin']));

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...localOneKeyPackages,
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
  axios: packageRoot('axios'),
  'bignumber.js': packageRoot('bignumber.js'),
  bytebuffer: packageRoot('bytebuffer'),
  jszip: packageRoot('jszip'),
  'parse-uri': packageRoot('parse-uri'),
  semver: packageRoot('semver'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '../package.json' &&
    context.originModulePath === localPackage('packages/core/src/data/config.ts')
  ) {
    return {
      type: 'sourceFile',
      filePath: localPackage('packages/core/package.json'),
    };
  }

  if (sourceEntryPoints[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: sourceEntryPoints[moduleName],
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// Enable package exports to allow resolving subpath imports like '@noble/hashes/blake2b'
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
