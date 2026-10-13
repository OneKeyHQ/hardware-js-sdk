module.exports = {
  rules: {
    '@typescript-eslint/require-await': 'off',
    'no-promise-executor-return': 'off',
    'no-void': 'off',
    'no-continue': 'off',
    'max-classes-per-file': 'off',
    // `electron` / `@stoprocent/noble` are optional native deps required lazily at runtime.
    'global-require': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-unresolved': ['error', { ignore: ['^electron$'] }],
  },
  ignorePatterns: ['tsup.config.ts', 'jest.config.js', '.eslintrc.js'],
};
