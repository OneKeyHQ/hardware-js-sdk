import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  // All source files → dist/ directory (cjs format)
  // This outputs index.js, cli.js, sdk.js, chains.js all to dist/
  // so cli.js can require('./sdk') and require('./chains')
  {
    input: {
      index: './src/index.ts',
      cli: './src/cli.ts',
      sdk: './src/sdk.ts',
      chains: './src/chains.ts',
    },
    output: [{ dir: 'dist', format: 'cjs' }],
    plugins: [typescript(), commonjs(), json()],
  },
  // Type declarations
  {
    input: './src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
  },
];

export default config;
