/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-import-module-exports */
import path from 'path';
import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import childProcess from 'child_process';

const pkg = require('./package.json');

const gitRevision = childProcess.execSync('git rev-parse HEAD').toString().trim();

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, 'src/index.ts'),
    preload: path.resolve(__dirname, 'src/preload.ts'),
  },
  target: 'electron-main', // 针对Electron主进程
  module: {
    rules: [
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
  externals: [
    nodeExternals({
      allowlist: Object.keys({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }),
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.COMMITHASH': JSON.stringify(gitRevision),
    }),
  ],
};
