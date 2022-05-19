import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import path from 'path';

const config = [
  {
    input: path.resolve('./src/index.ts'),
    output: [
      {
        dir: 'dist',
        format: 'cjs',
      },
    ],
    plugins: [typescript()],
  },
  {
    input: path.resolve('./src/index.ts'),
    output: { file: 'dist/index.d.ts', format: 'es' },
    format: 'es',
    plugins: [dts()],
  },
];

export default config;
