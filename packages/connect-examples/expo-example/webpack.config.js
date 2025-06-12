/* eslint-disable @typescript-eslint/no-var-requires */
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  // 获取基础的 Expo Webpack 配置
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      // 告诉 Expo 我们正在使用 monorepo 结构
      // 这会启用一些默认的 monorepo 支持
      projectRoot: path.resolve(__dirname, '../../..'),
    },
    argv
  );

  // --- 手动修复模块解析 ---
  // 1. 将 monorepo 的根 node_modules 添加到解析路径中
  config.resolve.modules.push(path.resolve(__dirname, '../../../node_modules'));

  // 2. 确保 Babel 会编译 monorepo 中的其他包
  // 这对于使用 TypeScript 或 JSX 语法的本地包是必需的
  config.module.rules.push({
    test: /\.(js|jsx|ts|tsx)$/,
    // `packages` 目录是所有本地包的根目录
    include: path.resolve(__dirname, '../../../packages'),
    use: 'babel-loader',
  });

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
