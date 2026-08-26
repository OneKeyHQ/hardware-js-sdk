import { defineConfig } from 'tsup';

export default defineConfig({
  // Map form controls emitted file names — see hwk-adapter-core's tsup.config.ts
  // for why: without it tsup preserves the `_subpath/` source directory in
  // `dist/`, leaking an internal layout detail into the package.json export map.
  entry: {
    index: 'src/index.ts',
    // Split so a browser bundle never pulls in the native `usb` binding
    // (nodeusb's dependency) and a Node/Electron bundle never pulls in a
    // `navigator.usb` reference (webusb's dependency) — each subpath only
    // imports its own transport package.
    webusb: 'src/_subpath/webusb.ts',
    nodeusb: 'src/_subpath/nodeusb.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Keeps the shared connector base (imported by both subpaths) in one
  // chunk instead of duplicating it into each entry's bundle.
  splitting: true,
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@keystonehq/hw-transport-error',
    '@keystonehq/hw-transport-usb',
    '@keystonehq/hw-transport-webusb',
    '@keystonehq/hw-transport-nodeusb',
    '@ngraveio/bc-ur',
    'usb',
  ],
});
