// Polyfill for Node.js APIs in the browser environment
import { Buffer as BufferClass } from 'buffer';

// 设置全局类型
declare global {
  interface Window {
    global: typeof globalThis;
    Buffer: typeof BufferClass;
    process: NodeJS.Process;
  }
  // 扩展 globalThis 类型
  // eslint-disable-next-line no-var
  var Buffer: typeof BufferClass;
  // eslint-disable-next-line no-var
  var global: typeof globalThis;
  // eslint-disable-next-line no-var
  var process: NodeJS.Process;
}

// 立即初始化全局变量 - 优先级最高
(function initializeGlobals() {
  // 首先设置 globalThis.Buffer
  if (typeof globalThis !== 'undefined') {
    globalThis.Buffer = BufferClass;
    globalThis.global = globalThis;
  }

  // 如果在浏览器环境，也设置 window 变量
  if (typeof window !== 'undefined') {
    window.global = window;
    window.Buffer = BufferClass;

    // 设置 process 对象
    if (!window.process) {
      window.process = {
        env: { NODE_ENV: process.env.NODE_ENV || 'production' },
        browser: true,
        nextTick: (cb: () => void) => setTimeout(cb, 0),
        version: 'v18.0.0',
        versions: { node: '18.0.0' },
      } as unknown as NodeJS.Process;
    }

    // 同步到 globalThis
    globalThis.process = window.process;
  }

  // 如果没有 window 对象（比如 Web Worker 环境）
  else if (typeof globalThis !== 'undefined' && !globalThis.process) {
    globalThis.process = {
      env: { NODE_ENV: process.env.NODE_ENV || 'production' },
      browser: true,
      nextTick: (cb: () => void) => setTimeout(cb, 0),
      version: 'v18.0.0',
      versions: { node: '18.0.0' },
    } as unknown as NodeJS.Process;
  }
})();

// 创建一个简化的 require 函数来避免 require is not defined 错误
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const windowAny = window as any;

  if (typeof windowAny.require === 'undefined') {
    windowAny.require = function (moduleName: string) {
      if (moduleName === 'buffer') {
        return { Buffer: BufferClass };
      }
      if (moduleName === 'process') {
        return window.process;
      }
      // 对于其他模块，返回空对象或抛出错误
      console.warn(`Module "${moduleName}" not available in browser environment`);
      return {};
    };

    // 也设置到全局作用域
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).require = windowAny.require;
  }
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
  const hasWindowBuffer =
    typeof window !== 'undefined' &&
    typeof window.Buffer !== 'undefined' &&
    typeof window.Buffer.from === 'function';
  const hasGlobalBuffer =
    typeof globalThis.Buffer !== 'undefined' && typeof globalThis.Buffer.from === 'function';

  if (!hasWindowBuffer && !hasGlobalBuffer) {
    console.error('Buffer polyfill not properly initialized!');
    return false;
  }

  // 测试 Buffer.from 方法
  try {
    const testBuffer = globalThis.Buffer.from('test', 'utf8');
    if (testBuffer && testBuffer.length === 4) {
      console.log('Buffer polyfill successfully initialized and tested');
      return true;
    } else {
      console.error('Buffer.from() test failed');
      return false;
    }
  } catch (error) {
    console.error('Buffer.from() test error:', error);
    return false;
  }
}

// 立即验证并记录结果
const isBufferInitialized = verifyBufferPolyfill();
if (!isBufferInitialized) {
  console.error('CRITICAL: Buffer polyfill initialization failed!');
  // 尝试手动设置全局 Buffer
  try {
    if (typeof globalThis !== 'undefined') {
      globalThis.Buffer = BufferClass;
    }
    if (typeof window !== 'undefined') {
      window.Buffer = BufferClass;
    }
    console.log('Manual Buffer initialization attempted');
  } catch (error) {
    console.error('Manual Buffer initialization failed:', error);
  }
}
