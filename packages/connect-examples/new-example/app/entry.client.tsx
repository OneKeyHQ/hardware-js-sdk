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

// GitHub Pages 路由支持：检查是否有重定向路径
const redirectPath = sessionStorage.getItem('redirectPath');
if (redirectPath) {
  sessionStorage.removeItem('redirectPath');
  // 使用 history.replaceState 替换当前历史记录
  history.replaceState(null, '', redirectPath);
}

// GitHub Pages hash 路由支持：处理从 404.html 重定向过来的 hash 路径
if (window.location.hash) {
  const hashPath = window.location.hash.substring(1); // 移除 # 号
  if (hashPath && hashPath !== '/') {
    // 将 hash 路径转换为正常路径
    history.replaceState(null, '', hashPath);
    // 清除 hash
    window.location.hash = '';
  }
}

// GitHub Pages base path - new-example 应该在 /hardware-js-sdk/new-example/ 路径下
const isGitHubPages = window.location.hostname.endsWith('github.io');
const basename =
  process.env.NODE_ENV === 'production' && isGitHubPages ? '/hardware-js-sdk/new-example/' : '/';

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
