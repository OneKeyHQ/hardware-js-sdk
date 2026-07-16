module.exports = {
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    'no-void': 'off',
    'no-continue': 'off',
    'no-nested-ternary': 'off',
    // shim.js bridges the Node `process` global; for-in over it is intentional.
    'no-restricted-syntax': 'off',
    // `./App` resolves to App.tsx (App/app.json case clash is a resolver false
    // positive); `/rn` is an exports subpath the node resolver can't follow.
    'import/no-unresolved': ['error', { ignore: ['^\\./App$', '^@onekeyfe/hwk-trezor-adapter/rn$'] }],
  },
  ignorePatterns: ['.eslintrc.js', 'metro.config.js', 'babel.config.js'],
};
