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
  },
};
