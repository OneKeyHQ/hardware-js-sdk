module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/lib', '<rootDir>/libDev'],
  collectCoverage: true,
  // collectCoverageFrom: ['src/**/*.ts'],
};
