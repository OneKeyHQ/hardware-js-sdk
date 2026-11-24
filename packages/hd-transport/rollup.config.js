import fs from 'fs';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

// Inline @bufbuild/protobuf (and its /wkt, /wire subpath exports) from its ESM build so
// Rollup tree-shakes unused codecs/well-known types and consumers using bundlers with
// package-exports disabled (e.g. React Native Metro) or conflicting @bufbuild/protobuf
// dependency trees work without resolver aliases.
const bufbuildEntry = require.resolve('@bufbuild/protobuf');
const bufbuildRoot = path.resolve(path.dirname(bufbuildEntry), '../..');
const bufbuildPkg = JSON.parse(fs.readFileSync(path.join(bufbuildRoot, 'package.json'), 'utf8'));

const resolveBufbuildEsm = () => ({
  name: 'resolve-bufbuild-protobuf-esm',
  resolveId(source) {
    if (source !== '@bufbuild/protobuf' && !source.startsWith('@bufbuild/protobuf/')) {
      return null;
    }
    const subpath =
      source === '@bufbuild/protobuf' ? '.' : `./${source.slice('@bufbuild/protobuf/'.length)}`;
    const exportEntry = bufbuildPkg.exports?.[subpath];
    const target =
      typeof exportEntry === 'string' ? exportEntry : exportEntry?.import ?? exportEntry?.default;
    if (!target) {
      throw new Error(`Unable to resolve ESM export "${source}" in @bufbuild/protobuf`);
    }
    return path.resolve(bufbuildRoot, target);
  },
});

const config = [
  {
    input: path.resolve('./src/index.ts'),
    output: [
      {
        dir: 'dist',
        format: 'cjs',
      },
    ],
    external: ['buffer', 'bytebuffer', 'events'],
    // @bufbuild/protobuf declares "sideEffects": false; honor it so Rollup drops unused
    // JSON/text-format/size-delimited/well-known-type modules from the inlined bundle.
    treeshake: {
      moduleSideEffects: id => !id.startsWith(bufbuildRoot),
    },
    plugins: [resolveBufbuildEsm(), typescript(), commonjs(), json()],
  },
  {
    input: path.resolve('./src/index.ts'),
    output: { file: 'dist/index.d.ts', format: 'es' },
    // Preserve API JSDoc tags such as @deprecated in published declarations.
    plugins: [dts({ compilerOptions: { removeComments: false } })],
  },
];

export default config;
