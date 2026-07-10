// Mirrors packages/connect-examples/expo-example/shim.js — non-destructive
// polyfills loaded before the React tree boots. Keep this file boring.
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';
if (typeof process === 'undefined') {
  global.process = require('process');
} else {
  const bProcess = require('process');
  for (const p in bProcess) {
    if (!(p in process)) {
      process[p] = bProcess[p];
    }
  }
}

process.browser = false;

if (typeof Buffer === 'undefined') {
  try {
    const { Buffer: BufferPolyfill } = require('buffer');
    global.Buffer = BufferPolyfill;
  } catch (error) {
    console.warn('Failed to load Buffer polyfill:', error);
  }
}
