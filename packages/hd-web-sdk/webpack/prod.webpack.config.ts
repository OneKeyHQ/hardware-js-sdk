import path from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';

import config from './webpack.config';

const sdkBuildTarget = process.env.SDK_BUILD_TARGET === 'min' ? 'min' : 'normal';
const isMinifiedBuild = sdkBuildTarget === 'min';
const shouldBuildSourceMap = process.env.SDK_BUILD_SOURCEMAP !== 'false';
const sdkEntryName = isMinifiedBuild ? 'onekey-js-sdk.min' : 'onekey-js-sdk';
const sdkEntry = path.resolve(__dirname, '../src/index.ts');

const prodConfig = {
  target: 'web',
  mode: 'production',
  devtool: shouldBuildSourceMap ? 'hidden-source-map' : false,
  entry: {
    [sdkEntryName]: sdkEntry,
  },
  output: config.output,

  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-typescript'],
            plugins: ['@babel/plugin-proposal-optional-chaining'],
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
    new webpack.DefinePlugin({
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      'process.env.VERSION': JSON.stringify(require('../package.json').version),
    }),
  ],

  optimization: {
    minimize: isMinifiedBuild,
    minimizer: isMinifiedBuild
      ? [
          new TerserPlugin({
            extractComments: false,
            parallel: false,
            terserOptions: {
              format: {
                comments: false,
              },
            },
          }),
        ]
      : [],
  },
};

export default prodConfig;
