/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
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

// 修复 Buffer 的导入方式，确保与 webpack fallback 兼容
if (typeof Buffer === 'undefined') {
  try {
    const { Buffer: BufferPolyfill } = require('buffer');
    global.Buffer = BufferPolyfill;
  } catch (error) {
    console.warn('Failed to load Buffer polyfill:', error);
  }
}

// global.location = global.location || { port: 80 }
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
// process.env['NODE_ENV'] = isDev ? 'development' : 'production'
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}
