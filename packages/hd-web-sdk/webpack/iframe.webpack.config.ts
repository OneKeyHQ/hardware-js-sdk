import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const BUILD = path.resolve(__dirname, '../build');

export default {
  target: 'web',
  mode: 'production',
  devtool: 'source-map',
  entry: {
    iframe: path.resolve(__dirname, '../src/iframe/index.ts'),
  },
  output: {
    filename: 'js/[name].[contenthash].js',
    path: BUILD,
    publicPath: './',
  },
  module: {
    rules: [
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
    extensions: ['.ts', '.js'],
    modules: ['node_modules'],

    fallback: {
      fs: false, // ignore "fs" import in fastxpub (hd-wallet)
      https: false, // ignore "https" import in "ripple-lib"
      vm: false, // ignore "vm" imports in "asn1.js@4.10.1" > crypto-browserify"
      util: require.resolve('util'), // required by "ripple-lib"
      assert: require.resolve('assert'), // required by multiple dependencies
      crypto: require.resolve('crypto-browserify'), // required by multiple dependencies
      events: require.resolve('events'),
    },
  },

  performance: {
    hints: false,
  },

  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      Promise: ['es6-promise', 'Promise'],
      process: 'process/browser',
    }),

    new HtmlWebpackPlugin({
      chunks: ['iframe'],
      filename: 'iframe.html',
      template: path.resolve(__dirname, '../static/iframe.html'),
      minify: false,
      inject: false,
    }),
  ],
};
