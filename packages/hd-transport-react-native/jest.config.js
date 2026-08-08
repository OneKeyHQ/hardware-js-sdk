module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/dist'],
  moduleNameMapper: {
    // The workspace symlinks resolve to prebuilt dist outputs that can lag behind src.
    '^@onekeyfe/hd-transport$': '<rootDir>/../hd-transport/src/index.ts',
    '^@onekeyfe/hd-shared$': '<rootDir>/../shared/src/index.ts',
  },
};
