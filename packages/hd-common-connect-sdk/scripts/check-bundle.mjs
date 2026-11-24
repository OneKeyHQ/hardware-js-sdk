import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { buildSync } from 'esbuild';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const options = {
  absWorkingDir: packageDirectory,
  stdin: {
    contents: `export { HardwareSDKLowLevel } from '@onekeyfe/hd-common-connect-sdk';`,
    resolveDir: packageDirectory,
  },
  bundle: true,
  format: 'cjs',
  logLevel: 'error',
  metafile: true,
  write: false,
};

const nativeUsbModule = /(?:^|\/)(?:hd-transport-usb|usb|node-gyp-build)\//u;
const hasNativeUsb = ({ metafile }) =>
  Object.keys(metafile.inputs).some(
    input => !input.startsWith('(disabled):') && nativeUsbModule.test(input)
  );

assert.equal(
  hasNativeUsb(buildSync({ ...options, platform: 'browser' })),
  false,
  'Browser bundles must exclude the native USB transport'
);
assert.equal(
  hasNativeUsb(buildSync({ ...options, platform: 'node' })),
  true,
  'Node bundles must retain the native USB transport'
);
