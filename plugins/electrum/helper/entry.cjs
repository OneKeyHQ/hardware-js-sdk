'use strict';

// Reserve stdout before loading SDK/native dependencies. Never forward diagnostics or exceptions.
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = () => true;
process.stderr.write = () => true;
for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir']) {
  console[method] = () => {};
}
process.on('uncaughtException', () => process.exit(1));
process.on('unhandledRejection', () => process.exit(1));

try {
  const { verifyRuntime, guardLoads } = require('./pin.cjs');
  if (process.argv[2] !== '--manifest' || process.argv[4] !== '--manifest-sha256') process.exit(1);
  const receipt = verifyRuntime(process.argv[3], process.argv[5]);
  guardLoads(receipt, __dirname);
  const common = require('@onekeyfe/hd-common-connect-sdk');
  const usb = require('@onekeyfe/hd-transport-usb');
  const sdk = common.default;
  const NodeUsbTransport = usb.default ?? usb;
  if (typeof NodeUsbTransport !== 'function' || typeof sdk.init !== 'function') process.exit(1);
  if (process.argv.length === 7 && process.argv[6] === '--smoke') {
    write(`${JSON.stringify({ v: 1, imports: true, sdkVersion: receipt.sdkVersion })}\n`);
  } else {
    const { serve } = require('./runtime.cjs');
    const generation = process.argv[7];
    if (process.argv.length !== 8 || process.argv[6] !== '--generation' || !/^[a-f0-9]{32}$/.test(generation)) process.exit(1);
    serve(sdk, process.stdin, write, () => process.exit(1), generation, 120000, receipt.sdkVersion);
  }
} catch {
  process.exit(1);
}
