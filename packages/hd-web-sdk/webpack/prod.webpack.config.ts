import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import config from './webpack.config';

const BUILD = path.resolve(__dirname, '../build');

const prodConfig = {
  target: 'web',
  mode: 'production',
  devtool: 'hidden-source-map',
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
  resolve: config.resolve,
  performance: {
    hints: false,
  },

  plugins: [
    new BundleAnalyzerPlugin({ analyzerMode: 'static', analyzer: '3001' }),
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
  ],

  optimization: {
    minimize: true,
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
