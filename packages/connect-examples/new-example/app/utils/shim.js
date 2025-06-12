/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */

// 直接导入 Buffer - Vite 会处理这个 import
import { Buffer as BufferPolyfill } from 'buffer';

// 设置基本的全局变量
if (typeof globalThis === 'undefined') {
  var globalThis = (function () {
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    if (typeof self !== 'undefined') return self;
    throw new Error('Unable to locate global object');
  })();
}

// 设置 global 引用
if (typeof global === 'undefined') {
  globalThis.global = globalThis;
}

// 设置 process 对象
if (typeof process === 'undefined') {
  globalThis.process = {
    env: { NODE_ENV: 'production' },
    browser: true,
    nextTick: cb => setTimeout(cb, 0),
    version: 'v18.0.0',
    versions: { node: '18.0.0' },
  };
} else {
  process.browser = true;
}

// 设置 Buffer 全局变量 - 使用已导入的 BufferPolyfill
if (typeof Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;

  // 如果在浏览器环境，也设置到 window
  if (typeof window !== 'undefined') {
    window.Buffer = BufferPolyfill;
  }

  console.log('Buffer polyfill loaded successfully');
}

// 开发环境调试设置
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.debug = process.env.NODE_ENV !== 'production' ? '*' : '';
  } catch (e) {
    // 忽略 localStorage 错误
  }
}
