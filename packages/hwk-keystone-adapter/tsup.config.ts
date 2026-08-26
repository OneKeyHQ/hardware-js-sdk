import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@keystonehq/keystone-sdk',
    '@keystonehq/bc-ur-registry',
    '@keystonehq/bc-ur-registry-eth',
    'bitcoinjs-lib',
    'bs58',
    'bs58check',
    'hdkey',
    'uuid',
  ],
});
