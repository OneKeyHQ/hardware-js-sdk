module.exports = {
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/unbound-method': 'off',
    'default-case': 'off',
    'default-param-last': 'off',
    'no-promise-executor-return': 'off',
    'no-return-await': 'off',
    'no-void': 'off',
    'no-continue': 'off',
    'import/no-unresolved': ['error', { ignore: ['^@ledgerhq/'] }],
  },
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['tsup.config.ts', 'jest.config.js', '.eslintrc.js'],
};
