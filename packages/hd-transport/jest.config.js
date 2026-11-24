module.exports = {
  preset: '../../jest.config.js',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['node_modules', '<rootDir>/lib', '<rootDir>/libDev'],
  collectCoverage: true,
  transformIgnorePatterns: ['/node_modules/', '/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  // collectCoverageFrom: ['src/**/*.ts'],
};
