import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@onekeyfe/hwk-ledger-adapter',
    '@ledgerhq/device-management-kit',
  ],
});
