import { defineConfig } from 'tsup';

export default defineConfig({
  // Map form controls emitted file names (see hwk-adapter-core's tsup.config.ts)
  // for why: without it tsup preserves the `_subpath/` source directory in
  // `dist/`, leaking an internal layout detail into the package.json export map.
  entry: {
    index: 'src/index.ts',
    // Kept apart so the core entry never pulls in a `navigator.usb` reference.
    webusb: 'src/_subpath/webusb.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Keeps the shared connector base in one chunk shared by the entries.
  splitting: true,
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@keystonehq/hw-transport-error',
    '@keystonehq/hw-transport-usb',
    '@keystonehq/hw-transport-webusb',
    '@ngraveio/bc-ur',
  ],
});
