module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/lib', '<rootDir>/libDev'],
  collectCoverage: true,
  // Generated codecs and compiled dependencies are already executable JavaScript.
  transformIgnorePatterns: ['/node_modules/', '/serialization/protobuf/generated/', '/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/serialization/protobuf/generated/', '/dist/'],
  // collectCoverageFrom: ['src/**/*.ts'],
};
