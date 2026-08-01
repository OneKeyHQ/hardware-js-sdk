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

process.browser = true;

// 修复 Buffer 的导入方式，确保与 webpack fallback 兼容
if (typeof Buffer === 'undefined') {
  try {
    const { Buffer: BufferPolyfill } = require('buffer');
    global.Buffer = BufferPolyfill;
  } catch (error) {
    console.warn('Failed to load Buffer polyfill:', error);
  }
}

// 设置 global 变量
if (typeof global === 'undefined') {
  if (typeof window !== 'undefined') {
    window.global = window;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.global = globalThis;
  }
}

// 设置开发模式调试
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}

console.log('Shim loaded successfully - Buffer and process are now available globally');
