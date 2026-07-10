import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Pure USB constants surface — VID/PID, USBDeviceFilter[], packet/endpoint
    // ids. Exported as `/constants` so wallet UIs can list filters without
    // pulling the transport class and its dependencies.
    constants: 'src/constants.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Without this, both `index` and `constants` outputs would duplicate the
  // VID/PID values. With splitting on, both reference the same chunk.
  splitting: true,
  external: ['@onekeyfe/hwk-adapter-core', '@onekeyfe/hwk-trezor-connector'],
});
