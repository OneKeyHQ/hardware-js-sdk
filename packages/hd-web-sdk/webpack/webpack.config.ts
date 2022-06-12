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
    modules: ['node_modules'],
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js'],
  },
};
