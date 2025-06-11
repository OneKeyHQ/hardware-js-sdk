// Polyfill for Node.js APIs in the browser environment
import { Buffer as BufferClass } from "buffer";

// 设置全局类型
declare global {
  interface Window {
    global: typeof globalThis;
    Buffer: typeof BufferClass;
    process: NodeJS.Process;
  }
}

// 确保全局对象可用
if (typeof window !== "undefined") {
  // 使 Buffer 全局可用
  window.global = window;
  window.Buffer = BufferClass;

  // 确保 process 对象可用
  if (!window.process) {
    // 使用双重类型断言来避免类型错误
    window.process = {
      env: { NODE_ENV: "development" },
      browser: true,
      nextTick: (cb: () => void) => setTimeout(cb, 0),
    } as unknown as NodeJS.Process;
  }
}

// 导出 buffer 包的 Buffer 类 - 这是一个完整的实现
export { Buffer } from "buffer";

// 如果在开发环境中，可以启用调试
if (typeof localStorage !== "undefined") {
  localStorage.debug = process.env.NODE_ENV !== "production" ? "*" : "";
}
