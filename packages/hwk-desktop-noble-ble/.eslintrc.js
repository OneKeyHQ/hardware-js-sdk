module.exports = {
  rules: {
    // Project-accepted relaxations (mirrors hwk-adapter-core / hwk-ledger-adapter).
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/unbound-method': 'off',
    'default-case': 'off',
    'default-param-last': 'off',
    'no-promise-executor-return': 'off',
    'no-return-await': 'off',
    'no-void': 'off',
    // Byte/protocol handling & runtime shims common to the Trezor SDK packages.
    'no-bitwise': 'off',
    'no-continue': 'off',
    'no-nested-ternary': 'off',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'max-classes-per-file': 'off',
    'no-useless-constructor': 'off',
    'no-new': 'off',
    // `electron` / `@stoprocent/noble` are optional native deps required lazily at runtime.
    'global-require': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-unresolved': ['error', { ignore: ['^electron$'] }],
  },
  ignorePatterns: ['tsup.config.ts', 'jest.config.js', '.eslintrc.js'],
};
