import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import config from './webpack.config';

const prodConfig = {
  target: 'web',
  mode: 'production',
  devtool: 'eval-source-map',
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
