module.exports = {
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/', '/public/'],
  watchPathIgnorePatterns: ['lib'],
  // Static codecs are already executable JavaScript; avoid parsing them again in each worker.
  transformIgnorePatterns: ['/node_modules/', '/hd-transport/(dist/|lib/protobuf-static\\.js$)'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { rootMode: 'upward' }],
  },
};
