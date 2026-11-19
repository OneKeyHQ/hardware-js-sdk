'use strict';
// Test-only injection. Production entry has no switch to load a mock SDK.
const Module = require('node:module');
const original = Module._load;
Module._load = function load(name, ...rest) {
  if (name === './pin.cjs') return { verifyRuntime: () => ({ sdkVersion: '1.2.10' }), guardLoads() {} };
  if (name === '@onekeyfe/hd-common-connect-sdk') {
    console.log('synthetic-do-not-forward');
    process.stdout.write('synthetic-do-not-forward');
    process.stderr.write('synthetic-do-not-forward');
    return { default: { init() { throw new Error('must not initialize during smoke'); } } };
  }
  if (name === '@onekeyfe/hd-transport-usb') return class NodeUsbTransport {};
  return original.call(this, name, ...rest);
};
