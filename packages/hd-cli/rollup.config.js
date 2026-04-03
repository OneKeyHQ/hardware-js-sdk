import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  // Library entry (index.ts)
  {
    input: './src/index.ts',
    output: [{ dir: 'dist', format: 'cjs' }],
    plugins: [typescript(), commonjs(), json()],
  },
  // CLI entry (cli.ts) — produces dist/cli.js with shebang
  {
    input: './src/cli.ts',
    output: [
      {
        file: 'dist/cli.js',
        format: 'cjs',
        banner: '#!/usr/bin/env node',
      },
    ],
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
