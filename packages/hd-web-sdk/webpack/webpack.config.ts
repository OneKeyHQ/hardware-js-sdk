import path from 'path';

export default {
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../build'),
    publicPath: './',
    library: 'onekey-js-sdk',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
  resolve: {
    alias: {
      // fix the issue where webpack 5 does not recognize jszip after keeping the 'require' field.
      jszip: path.resolve(__dirname, '../../../node_modules/jszip/lib/index.js'),
    },
    modules: ['node_modules'],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],

    fallback: {
      crypto: require.resolve('crypto-browserify'), // required by multiple dependencies
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
    },
  },
};
