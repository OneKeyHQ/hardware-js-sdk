/**
 * 客户端入口文件
 *
 * 使用 react-router-dom 进行纯客户端渲染
 * 利用 Remix 的组件和工具，但避免 SSR 复杂性
 */

// 先导入 shim 以确保 Node.js polyfills 在应用其余部分之前加载
import './utils/shim.js';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { SDKProvider } from './components/providers/SDKProvider';
import { I18nProvider } from './i18n/i18n-provider';
import { CommandPalette } from './components/commandPalette';
import MainLayout from './components/layout/MainLayout';
import { Toaster } from './components/ui/Toaster';

// Import existing route components
import IndexPage from './routes/_index';
import LogsPage from './routes/logs';
import EmulatorPage from './routes/emulator';

import ChainsIndexPage from './routes/chains._index';
import ChainMethodsIndexPage from './routes/chains.$chainId._index';
import ChainMethodExecutePage from './routes/chains.$chainId.$methodName';
import DeviceMethodsIndexPage from './routes/device-methods._index';
import DeviceMethodExecutePage from './routes/device-methods.$methodName';

// Import styles
import './tailwind.css';

// Declare global variable for TypeScript
declare global {
  interface Window {
    __isClient: boolean;
  }
}

// Mark as client-side rendering
window.__isClient = true;

// 根据环境确定 basename
const basename = process.env.NODE_ENV === 'production' ? '/new-example' : '';

// 处理从404页面重定向过来的路径恢复
function handleSpaRedirect() {
  const redirectUrl = sessionStorage.getItem('spa_redirect_url');
  if (
    redirectUrl &&
    redirectUrl !== window.location.pathname + window.location.search + window.location.hash
  ) {
    console.log('Restoring SPA route from redirect:', redirectUrl);
    sessionStorage.removeItem('spa_redirect_url');
    // 使用 window.history.replaceState 替换当前历史记录
    window.history.replaceState(null, '', redirectUrl);
  }
}

// Layout wrapper component
function RootLayout() {
  return (
    <I18nProvider>
      <SDKProvider>
        <CommandPalette>
          <MainLayout>
            <Outlet />
          </MainLayout>
          <Toaster />
        </CommandPalette>
      </SDKProvider>
    </I18nProvider>
  );
}

// 创建路由配置
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        {
          index: true,
          element: <IndexPage />,
        },
        {
          path: 'logs',
          element: <LogsPage />,
        },
        {
          path: 'emulator',
          element: <EmulatorPage />,
        },

        {
          path: 'device-methods',
          element: <DeviceMethodsIndexPage />,
        },
        {
          path: 'device-methods/:methodName',
          element: <DeviceMethodExecutePage />,
        },

        {
          path: 'chains',
          element: <ChainsIndexPage />,
        },
        {
          path: 'chains/:chainId',
          element: <ChainMethodsIndexPage />,
        },
        {
          path: 'chains/:chainId/:methodName',
          element: <ChainMethodExecutePage />,
        },
      ],
    },
  ],
  {
    basename,
  }
);

// 启动应用
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

// 在渲染前处理路由恢复
handleSpaRedirect();

const root = createRoot(container);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
