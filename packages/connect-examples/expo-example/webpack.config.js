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

    // 添加 commit SHA 和构建时间到全局变量
    definePlugin.definitions.__COMMIT_SHA__ = JSON.stringify(
      process.env.EXPO_PUBLIC_COMMIT_SHA || 'dev'
    );
    definePlugin.definitions.__BUILD_TIME__ = JSON.stringify(new Date().toISOString());
  }

  // 如果在生产环境且有 commit SHA，修改输出文件名
  if (process.env.NODE_ENV === 'production' && process.env.EXPO_PUBLIC_COMMIT_SHA) {
    const commitSha = process.env.EXPO_PUBLIC_COMMIT_SHA;

    // 修改 JS 文件名
    if (config.output.filename) {
      config.output.filename = config.output.filename.replace('[hash]', `${commitSha}-[hash]`);
    }
    if (config.output.chunkFilename) {
      config.output.chunkFilename = config.output.chunkFilename.replace(
        '[hash]',
        `${commitSha}-[hash]`
      );
    }

    // 修改 CSS 文件名
    const miniCssExtractPlugin = config.plugins.find(
      plugin => plugin.constructor.name === 'MiniCssExtractPlugin'
    );
    if (miniCssExtractPlugin && miniCssExtractPlugin.options) {
      if (miniCssExtractPlugin.options.filename) {
        miniCssExtractPlugin.options.filename = miniCssExtractPlugin.options.filename.replace(
          '[hash]',
          `${commitSha}-[hash]`
        );
      }
      if (miniCssExtractPlugin.options.chunkFilename) {
        miniCssExtractPlugin.options.chunkFilename =
          miniCssExtractPlugin.options.chunkFilename.replace('[hash]', `${commitSha}-[hash]`);
      }
    }
  }

  return config;
};
