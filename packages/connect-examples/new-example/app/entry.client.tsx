/**
 * 客户端入口文件
 *
 * 使用 react-router-dom 进行纯客户端渲染
 * 利用 Remix 的组件和工具，但避免 SSR 复杂性
 */

// 先导入 shim 以确保 Node.js polyfills 在应用其余部分之前加载
import './utils/shim.js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './root';

// Declare global variable for TypeScript
declare global {
  interface Window {
    __isClient: boolean;
  }
}

// Set global flag for client detection
window.__isClient = true;

// 处理从 404 页面重定向过来的路径
const redirectPath = sessionStorage.getItem('redirectPath');
if (redirectPath) {
  sessionStorage.removeItem('redirectPath');
  // 使用 history.replaceState 替换当前历史记录
  history.replaceState(null, '', redirectPath);
}

// 生产环境使用 GitHub Pages 路径，开发环境使用根路径
const basename = process.env.NODE_ENV === 'production' ? '/hardware-js-sdk/new-example/' : '/';

// Create a root and render directly - no hydration needed for client-only app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
