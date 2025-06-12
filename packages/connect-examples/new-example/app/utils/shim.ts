// Polyfill for Node.js APIs in the browser environment
import { Buffer as BufferClass } from 'buffer';

// 设置全局类型
declare global {
  interface Window {
    global: typeof globalThis;
    Buffer: typeof BufferClass;
    process: NodeJS.Process;
  }
}

// 确保全局对象可用
if (typeof window !== 'undefined') {
  // 使 Buffer 全局可用 - 同时设置 window 和 globalThis
  window.global = window;
  window.Buffer = BufferClass;
  globalThis.Buffer = BufferClass;

  // 确保 process 对象可用
  if (!window.process) {
    // 使用双重类型断言来避免类型错误
    window.process = {
      env: { NODE_ENV: 'production' }, // 在生产环境中使用正确的 NODE_ENV
      browser: true,
      nextTick: (cb: () => void) => setTimeout(cb, 0),
    } as unknown as NodeJS.Process;
  }
} else if (typeof globalThis !== 'undefined') {
  // 如果没有 window 对象（比如 Web Worker 环境），直接设置 globalThis
  globalThis.Buffer = BufferClass;
}

// 导出 buffer 包的 Buffer 类 - 这是一个完整的实现
export { Buffer } from 'buffer';

// 在开发环境中启用调试
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.debug = process.env.NODE_ENV !== 'production' ? '*' : '';
  } catch (e) {
    // 如果 localStorage 不可用，忽略错误
  }
}

// 添加一个验证函数来确保 Buffer 正确初始化
export function verifyBufferPolyfill(): boolean {
  const hasWindowBuffer = typeof window !== 'undefined' && typeof window.Buffer !== 'undefined';
  const hasGlobalBuffer = typeof globalThis.Buffer !== 'undefined';

  if (!hasWindowBuffer && !hasGlobalBuffer) {
    console.error('Buffer polyfill not properly initialized!');
    return false;
  }

  console.log('Buffer polyfill successfully initialized');
  return true;
}

// 立即验证
verifyBufferPolyfill();
