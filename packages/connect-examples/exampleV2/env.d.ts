/// <reference types="node" />

declare global {
  // 全局变量声明
  const __COMMIT_SHA__: string;
  const __BUILD_TIME__: string;

  // 添加 Buffer 到 window 对象的类型声明
  interface Window {
    Buffer: typeof Buffer;
  }

  // 环境变量类型
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
      COMMIT_SHA?: string;
      BUILD_TIME?: string;
    }
  }
}

// 静态资源模块声明
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

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

// CSS 模块声明
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Markdown module declarations
declare module '*.md' {
  const content: string;
  export default content;
}

declare module '*.mdx' {
  const content: string;
  export default content;
}

// Third-party modules without bundled types
declare module 'react-markdown';
declare module 'remark-gfm';

// MDX modules under docs alias
declare module '@docs/*' {
  import React from 'react';
  const MDXComponent: React.ComponentType<unknown>;
  export default MDXComponent;
}

export {};
