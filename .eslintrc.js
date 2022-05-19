module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },
  plugins: ['import', '@typescript-eslint', 'prettier'],
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
    'plugin:prettier/recommended',
  ],
  env: {
    jest: true,
  },
  ignorePatterns: [
    '**/lib/*',
    '**/libDev/*',
    '**/dist/*',
    '**/coverage/*',
    '**/build/*',
    '**/node_modules/*',
  ],
  rules: {
    'import/extensions': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    // We need empty functions for mocking modules for react-native
    '@typescript-eslint/no-empty-function': 'off',
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',
    // valid case of class method overloads in typescript
    'no-dupe-class-members': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    //  Missing return type on function
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // note you must disable the base rule as it can report incorrect errors
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'require-await': ['error'],
  },
};
