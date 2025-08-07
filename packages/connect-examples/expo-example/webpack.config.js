/* eslint-disable @typescript-eslint/no-var-requires */
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

// Expo CLI will await this method so you can optionally return a promise.
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // 设置 publicPath 为 GitHub Pages 的路径
  if (process.env.NODE_ENV === 'production') {
    config.output.publicPath = '/expo-example/';
  } else {
    // 开发环境使用根路径
    config.output.publicPath = '/';
  }

  // 配置 SPA 路由支持
  if (config.devServer) {
    // 开发环境配置
    config.devServer.historyApiFallback = {
      index: '/',
      rewrites: [
        {
          from: /^\/expo-example\/.*$/,
          to: '/',
        },
      ],
    };
  }

  // 在生产环境中，确保使用我们的自定义 HTML 模板
  if (process.env.NODE_ENV === 'production') {
    const htmlPluginIndex = config.plugins.findIndex(plugin => plugin instanceof HtmlWebpackPlugin);
    if (htmlPluginIndex !== -1) {
      const originalPlugin = config.plugins[htmlPluginIndex];
      // 创建新的 HtmlWebpackPlugin 实例，使用我们的模板
      config.plugins[htmlPluginIndex] = new HtmlWebpackPlugin({
        ...originalPlugin.options,
        template: './public/index.html',
      });
    }
  }

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

  // 添加或修改 DefinePlugin 来注入 commit SHA 和 CONNECT_SRC
  const commitSha = process.env.EXPO_PUBLIC_COMMIT_SHA || process.env.COMMIT_SHA || 'dev';
  const buildTime = new Date().toISOString();
  const connectSrc = process.env.CONNECT_SRC;

  // 查找现有的 DefinePlugin
  const definePluginIndex = config.plugins.findIndex(
    plugin => plugin.constructor.name === 'DefinePlugin'
  );

  if (definePluginIndex !== -1) {
    // 修改现有的 DefinePlugin
    const existingPlugin = config.plugins[definePluginIndex];
    config.plugins[definePluginIndex] = new webpack.DefinePlugin({
      ...existingPlugin.definitions,
      __COMMIT_SHA__: JSON.stringify(commitSha),
      __BUILD_TIME__: JSON.stringify(buildTime),
      'process.env.EXPO_PUBLIC_COMMIT_SHA': JSON.stringify(commitSha),
      'process.env.CONNECT_SRC': JSON.stringify(connectSrc),
    });
  } else {
    // 添加新的 DefinePlugin
    config.plugins.push(
      new webpack.DefinePlugin({
        __COMMIT_SHA__: JSON.stringify(commitSha),
        __BUILD_TIME__: JSON.stringify(buildTime),
        'process.env.EXPO_PUBLIC_COMMIT_SHA': JSON.stringify(commitSha),
        'process.env.CONNECT_SRC': JSON.stringify(connectSrc),
      })
    );
  }

  return config;
};
