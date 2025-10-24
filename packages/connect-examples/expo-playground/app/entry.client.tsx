/**
 * 客户端入口文件
 *
 * 使用 react-router-dom 进行纯客户端渲染
 */

// 先导入 shim 以确保 Node.js polyfills 在应用其余部分之前加载
import './utils/shim.js';

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { SDKProvider } from './components/providers/SDKProvider';
import { I18nProvider } from './i18n/i18n-provider';
import { CommandPalette } from './components/common/CommandPalette';
import MainLayout from './components/layout/MainLayout';
import { Toaster } from './components/ui/Toaster';
import { useTheme } from './hooks/use-theme';

// Import existing route components
import IndexPage from './routes/_index';
import LogsPage from './routes/logs';
import EmulatorPage from './routes/emulator';
import DeviceInfoPage from './routes/device-info';

import ChainsIndexPage from './routes/chains._index';
import ChainMethodsIndexPage from './routes/chains.$chainId._index';
import ChainMethodExecutePage from './routes/chains.$chainId.$methodName';
import DeviceMethodsIndexPage from './routes/device-methods._index';
import DeviceMethodExecutePage from './routes/device-methods.$methodName';

// Import styles
import './tailwind.css';

// 运行时自动检测 basename：
// - 若路径以 /expo-playground 开头，则使用 '/expo-playground'（GitHub Pages 子路径）
// - 否则使用 ''（CDN 根路径或其他根部署）
const basename = (() => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return `/${segments[0]}`;
  }
  return '';
})();

// 处理从404页面重定向过来的路径恢复
function handleSpaRedirect() {
  const redirectUrl = sessionStorage.getItem('spa_redirect_url');

  if (redirectUrl) {
    console.log('Found SPA redirect URL in sessionStorage:', redirectUrl);

    // 清除 sessionStorage 中的重定向 URL
    sessionStorage.removeItem('spa_redirect_url');

    // 检查当前 URL 是否已经是目标 URL
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;

    if (redirectUrl !== currentUrl) {
      console.log('Restoring SPA route from redirect:', redirectUrl);

      // 使用 window.history.replaceState 恢复原始 URL
      window.history.replaceState(null, '', redirectUrl);
    }
  }

  // 保持 404 重定向的 sessionStorage 路由恢复（用于 GH Pages 子路径）
}

// Layout wrapper component
function RootLayout() {
  const { theme } = useTheme();
  useEffect(() => {
    if (theme === 'dark') {
      import('highlight.js/styles/github-dark.css');
    } else {
      import('highlight.js/styles/github.css');
    }
  }, [theme]);
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
          path: 'device-info',
          element: <DeviceInfoPage />,
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
