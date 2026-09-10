module.exports = {
  extends: ['../hwk-ledger-connector-ble/.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['tsup.config.ts', 'jest.config.js', '.eslintrc.js'],
  overrides: [
    {
      files: ['scripts/*.js'],
      parserOptions: { project: '../../tsconfig.json' },
    },
  ],
};
