import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'attestation-relay': 'src/attestationRelay/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@ledgerhq/device-management-kit',
    '@ledgerhq/device-signer-kit-ethereum',
    '@ledgerhq/device-signer-kit-bitcoin',
    '@ledgerhq/device-signer-kit-solana',
    '@ledgerhq/device-transport-kit-node-hid',
    '@ledgerhq/device-transport-kit-react-native-ble',
    '@ledgerhq/device-transport-kit-web-hid',
    '@onekeyfe/hwk-adapter-core',
    'react-native',
    'react-native-ble-plx',
    'rxjs',
    'ws',
  ],
});
