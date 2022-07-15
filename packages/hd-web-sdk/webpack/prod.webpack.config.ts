import path from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import config from './webpack.config';

const prodConfig = {
  target: 'web',
  mode: 'production',
  devtool: 'hidden-source-map',
  entry: {
    'onekey-js-sdk': path.resolve(__dirname, '../src/index.ts'),
    'onekey-js-sdk.min': path.resolve(__dirname, '../src/index.ts'),
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

export default prodConfig;
