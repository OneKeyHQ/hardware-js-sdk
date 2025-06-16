/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */

// 使用 ES module import 来导入 Buffer 和 process
import { Buffer as BufferPolyfill } from 'buffer';
import processPolyfill from 'process';

// 设置全局变量，确保在浏览器环境中可用
if (typeof globalThis !== 'undefined') {
  // 设置 Buffer 全局变量
  if (typeof globalThis.Buffer === 'undefined') {
    globalThis.Buffer = BufferPolyfill;
  }

  // 设置 process 全局变量 - 与 Buffer 处理方式一致
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = processPolyfill;
  }

  // 设置 global 变量指向 globalThis
  if (typeof globalThis.global === 'undefined') {
    globalThis.global = globalThis;
  }

  // 确保 window 对象也有这些全局变量（如果在浏览器环境中）
  if (typeof window !== 'undefined') {
    if (typeof window.Buffer === 'undefined') {
      window.Buffer = BufferPolyfill;
    }
    if (typeof window.process === 'undefined') {
      window.process = processPolyfill;
    }
    if (typeof window.global === 'undefined') {
      window.global = globalThis;
    }
  }
}

// 为 window 对象设置这些变量（如果在浏览器环境中）
if (typeof window !== 'undefined') {
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = BufferPolyfill;
  }

  if (typeof window.process === 'undefined') {
    window.process = processPolyfill;
  }

  if (typeof window.global === 'undefined') {
    window.global = globalThis;
  }
}

// 设置开发模式调试
const isDev = typeof __DEV__ === 'boolean' && __DEV__;
if (typeof localStorage !== 'undefined') {
  localStorage.debug = isDev ? '*' : '';
}

console.log('Shim loaded successfully - Buffer and process are now available globally');
