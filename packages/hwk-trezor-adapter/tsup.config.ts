import { defineConfig } from 'tsup';

export default defineConfig({
  // Single public entry. No sub-exports: consumers (OneKey + the RN BLE
  // connector) import everything — including the BLE constants/helpers — from
  // the main entry, which tree-shakes cleanly. A `/rn` subpath previously
  // existed but was a strict subset of `index` and only forced downstream
  // bundlers (Metro with package-exports disabled) to add manual aliases, so
  // it was removed.
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  // Local debug-watch copies only this package's dist into app-monorepo.
  // Bundle the ML-DSA implementation so that flow works without publishing or
  // separately installing a new transitive package in every client platform.
  noExternal: [/^@noble\/post-quantum/, /^@noble\/ciphers/, /^@noble\/curves/, /^@noble\/hashes/],
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@onekeyfe/hwk-trezor-protobuf',
    '@onekeyfe/hwk-trezor-protocol',
    '@onekeyfe/hwk-trezor-transport',
    'buffer',
  ],
});
