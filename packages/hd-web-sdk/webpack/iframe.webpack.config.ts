import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import config from './webpack.config';

const BUILD = path.resolve(__dirname, '../build');
const PUBLIC_PATH = process.env.PUBLIC_PATH || './';

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
    publicPath: PUBLIC_PATH,
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
  resolve: config.resolve,

  performance: {
    hints: false,
  },

  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      Promise: ['es6-promise', 'Promise'],
      process: 'process/browser',
    }),

    new CopyWebpackPlugin({
      patterns: [{ from: '../../packages/core/src/data', to: `${BUILD}/data` }],
    }),

    new HtmlWebpackPlugin({
      chunks: ['iframe'],
      filename: 'iframe.html',
      template: path.resolve(__dirname, '../static/iframe.html'),
      minify: false,
      inject: false,
    }),

    new webpack.DefinePlugin({
      'process.env.PUBLIC_PATH': JSON.stringify(PUBLIC_PATH),
    }),
  ],
};
