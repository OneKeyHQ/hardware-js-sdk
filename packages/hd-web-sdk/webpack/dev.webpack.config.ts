import path from 'path';
import fs from 'fs';
import { merge } from 'webpack-merge';
import { WebpackPluginServe } from 'webpack-plugin-serve';

import config from './webpack.config';
import iframe from './iframe.webpack.config';
import prod from './prod.webpack.config';

const dev = {
  mode: 'development',
  watch: true,
  devtool: 'source-map',
  entry: {
    'onekey-js-sdk': path.resolve(__dirname, '../src/index.ts'),
  },
  output: config.output,
  resolve: config.resolve,
  plugins: [
    new WebpackPluginServe({
      port: 8087,
      hmr: true,
      https: {
        key: fs.readFileSync(path.join(__dirname, '../webpack/https_dev.key')),
        cert: fs.readFileSync(path.join(__dirname, '../webpack/https_dev.crt')),
      },
      static: [path.join(__dirname, '../build')],
    }),
  ],
};

export default merge([prod, iframe, dev]);
