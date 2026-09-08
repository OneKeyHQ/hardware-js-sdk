module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/dist'],
  moduleNameMapper: {
    '^@onekeyfe/hd-core$': '<rootDir>/../core/src/index.ts',
    '^@onekeyfe/hd-shared$': '<rootDir>/../shared/src/index.ts',
    '^@onekeyfe/hd-transport-react-native$': '<rootDir>/../hd-transport-react-native/src/index.ts',
  },
};
