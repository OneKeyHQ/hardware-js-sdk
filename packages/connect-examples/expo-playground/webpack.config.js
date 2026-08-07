/* eslint-disable no-undef */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = async (env, argv) => {
  // Dynamically import ESM-only rehype-highlight
  const rehypeHighlight = (await import('rehype-highlight')).default;
  const isProduction = argv.mode === 'production';
  const commitSha = isProduction ? (process.env.COMMIT_SHA || '').trim() : '';
  const hasCommit = Boolean(commitSha);
  const assetPublicPath = hasCommit ? `./${commitSha}/` : 'auto';
  const htmlPublicPath = hasCommit ? assetPublicPath : undefined;
  const outputPath = hasCommit
    ? path.resolve(__dirname, 'dist', commitSha)
    : path.resolve(__dirname, 'dist');
  const indexHtmlFilename = hasCommit ? '../index.html' : 'index.html';
  const fallbackHtmlFilename = hasCommit ? '../404.html' : '404.html';
  const staticBasePath = hasCommit ? `./${commitSha}/` : './';
  const buildTime = new Date().toISOString();

  return {
    entry: './app/entry.client.tsx',
    mode: isProduction ? 'production' : 'development',
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    output: {
      path: outputPath,
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
      // 使用 webpack5 的 auto，让资源在 GH Pages 子路径与 CDN 根路径都能正确加载
      publicPath: assetPublicPath,
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.md', '.mdx'],
      alias: {
        '~': path.resolve(__dirname, 'app'),
      },
      fallback: {
        // Node.js polyfills for browser
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser.js'),
        util: require.resolve('util'),
        events: require.resolve('events'),
        os: require.resolve('os-browserify'),
        vm: require.resolve('vm-browserify'),
        // Disable unnecessary Node.js modules
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        dgram: false,
        cluster: false,
        module: false,
        readline: false,
        repl: false,
      },
    },

    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
          type: 'asset/resource',
        },
        {
          test: /\.mdx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: 'defaults' }],
                  ['@babel/preset-react', { runtime: 'automatic' }],
                  '@babel/preset-typescript',
                ],
              },
            },
            {
              loader: '@mdx-js/loader',
              options: {
                rehypePlugins: [rehypeHighlight],
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
          type: 'asset/resource',
        },
      ],
    },

    plugins: [
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        inject: true,
        filename: indexHtmlFilename,
        ...(htmlPublicPath ? { publicPath: htmlPublicPath } : {}),
        templateParameters: {
          BASE_PATH: staticBasePath,
        },
      }),
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        inject: true,
        filename: fallbackHtmlFilename,
        ...(htmlPublicPath ? { publicPath: htmlPublicPath } : {}),
        templateParameters: {
          BASE_PATH: staticBasePath,
        },
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '.',
            globOptions: {
              ignore: ['**/index.html'], // 忽略 index.html，因为 HtmlWebpackPlugin 会处理它
            },
          },
        ],
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: ['process/browser.js'],
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.COMMIT_SHA': JSON.stringify(isProduction && commitSha ? commitSha : 'dev'),
        'process.env.BUILD_TIME': JSON.stringify(buildTime),
        __COMMIT_SHA__: JSON.stringify(isProduction && commitSha ? commitSha : 'dev'),
        __BUILD_TIME__: JSON.stringify(buildTime),
      }),
    ],

    devServer: {
      port: 3010,
      host: 'localhost',
      open: true,
      hot: true,
      historyApiFallback: true,
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      client: {
        logging: 'info',
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      devMiddleware: {
        stats: 'minimal',
      },
    },

    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },

    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
