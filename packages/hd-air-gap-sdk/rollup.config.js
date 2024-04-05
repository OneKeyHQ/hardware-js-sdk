import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
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
    format: 'es',
    plugins: [
      dts(),
      copy({
        targets: [
          { src: 'src/thirdparty/cbor-sync/cbor-sync.d.ts', dest: 'dist/thirdparty/cbor-sync' },
        ],
      }),
    ],
  },
];

export default config;
