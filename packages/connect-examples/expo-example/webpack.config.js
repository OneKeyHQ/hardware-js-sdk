/* eslint-disable @typescript-eslint/no-var-requires */
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // 只为我们自己的代码启用 source map
  config.module.rules = config.module.rules.filter(rule => {
    if (!rule || !rule.use) return true;
    const uses = Array.isArray(rule.use) ? rule.use : [rule.use];
    return !uses.some(use => {
      const loader = typeof use === 'string' ? use : use.loader;
      return loader && loader.includes('source-map-loader');
    });
  });

  // 保持其他配置不变
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

  const definePlugin = config.plugins.find(plugin => plugin.constructor.name === 'DefinePlugin');
  if (definePlugin) {
    const processEnv = {};
    Object.keys(process.env).forEach(key => {
      processEnv[key] = JSON.stringify(process.env[key]);
    });

    definePlugin.definitions['process.env'] = processEnv;
  }
  return config;
};
