import webpack from 'webpack';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';

const config: webpack.Configuration = {
  target: 'web',
  mode: 'production',
  devtool: 'source-map',
  entry: {
    'onekey-js-sdk': path.resolve(__dirname, '../src/index.ts'),
    'onekey-js-sdk.min': path.resolve(__dirname, '../src/index.ts'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
    publicPath: './',
    library: 'onekey-js-sdk',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },

  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-typescript'],
          },
        },
      },
    ],
  },
  resolve: {
    modules: ['node_modules'],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],

    fallback: {
      fs: false, // ignore "fs" import in fastxpub (hd-wallet)
      https: false, // ignore "https" import in "ripple-lib"
      vm: false, // ignore "vm" imports in "asn1.js@4.10.1" > crypto-browserify"
      util: require.resolve('util'), // required by "ripple-lib"
      assert: require.resolve('assert'), // required by multiple dependencies
      crypto: require.resolve('crypto-browserify'), // required by multiple dependencies
      stream: require.resolve('stream-browserify'), // required by utxo-lib and keccak
      events: require.resolve('events'),
      buffer: require.resolve('buffer/'),
    },
  },
  performance: {
    hints: false,
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        exclude: /onekey-js-sdk.js/,
        extractComments: false,
        terserOptions: {
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
};

export default config;
