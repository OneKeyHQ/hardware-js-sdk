module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  transformIgnorePatterns: ['/node_modules/(?!@noble/(curves|hashes)/)'],
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/dist'],
  moduleNameMapper: {
    '^@onekeyfe/hwk-adapter-core$': '<rootDir>/../hwk-adapter-core/src/index.ts',
    '^@onekeyfe/hwk-trezor-protobuf$': '<rootDir>/../hwk-trezor-protobuf/src/index.ts',
    '^@onekeyfe/hwk-trezor-protocol$': '<rootDir>/../hwk-trezor-protocol/src/index.ts',
    '^@onekeyfe/hwk-trezor-transport$': '<rootDir>/../hwk-trezor-transport/src/index.ts',
    '^@onekeyfe/hwk-trezor-type-utils$': '<rootDir>/../hwk-trezor-type-utils/src/index.ts',
    '^@onekeyfe/hwk-trezor-utils$': '<rootDir>/../hwk-trezor-utils/src/index.ts',
    '^@onekeyfe/hwk-trezor-schema-utils$': '<rootDir>/../hwk-trezor-schema-utils/src/index.ts',
  },
};
