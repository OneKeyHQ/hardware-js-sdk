module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/dist'],
  moduleNameMapper: {
    '^@onekeyfe/hwk-ledger-adapter$': '<rootDir>/../hwk-ledger-adapter/src/index.ts',
    '^@onekeyfe/hwk-adapter-core$': '<rootDir>/../hwk-adapter-core/src/index.ts',
  },
};
