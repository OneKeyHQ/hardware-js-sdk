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
    // Lazy/optional native deps are required at runtime, not statically imported.
    'global-require': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-dynamic-require': 'off',
    // `@onekeyfe/hwk-trezor-adapter/rn` is an exports subpath the node import
    // resolver can't follow (Node/TS both resolve it fine at build/runtime).
    'import/no-unresolved': ['error', { ignore: ['^@onekeyfe/hwk-trezor-adapter/rn$'] }],
  },
  ignorePatterns: ['tsup.config.ts', 'jest.config.js', '.eslintrc.js'],
};
