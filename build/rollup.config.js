import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';

const config = [
  {
    input: path.resolve('./src/index.ts'),
    output: [
      {
        dir: 'dist',
        format: 'cjs',
      },
    ],
    plugins: [typescript(), commonjs(), json()],
  },
  {
    input: path.resolve('./src/index.ts'),
    output: { file: 'dist/index.d.ts', format: 'es' },
    // Preserve API JSDoc tags such as @deprecated in published declarations.
    plugins: [dts({ compilerOptions: { removeComments: false } })],
  },
];

export default config;
