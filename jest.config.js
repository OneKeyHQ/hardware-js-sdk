module.exports = {
  globals: {
    'ts-jest': {
      isolatedModules: false,
    },
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/', '/public/'],
  transform: {
    '\\.(js|jsx|ts|tsx)$': ['babel-jest'],
  },
  watchPathIgnorePatterns: ['lib'],
};
