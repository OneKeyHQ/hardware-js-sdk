/// <reference types="@remix-run/dev" />
/// <reference types="vite/client" />

declare global {
  // 全局变量声明
  const __COMMIT_SHA__: string;
  const __BUILD_TIME__: string;

  // 添加 Buffer 到 window 对象的类型声明
  interface Window {
    Buffer: typeof Buffer;
  }
}

// ESM 模块声明
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

export {};
