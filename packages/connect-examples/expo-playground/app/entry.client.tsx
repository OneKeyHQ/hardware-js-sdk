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

// 根据环境确定 basename
const basename = process.env.NODE_ENV === 'production' ? '/expo-playground' : '';

// 处理从404页面重定向过来的路径恢复
function handleSpaRedirect() {
  const redirectUrl = sessionStorage.getItem('spa_redirect_url');
  if (redirectUrl) {
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    console.log('SPA redirect check:', { redirectUrl, currentUrl });

    if (redirectUrl !== currentUrl) {
      console.log('Restoring SPA route from redirect:', redirectUrl);
      sessionStorage.removeItem('spa_redirect_url');

      // 移除 basename 前缀来获取相对路径
      const basename = '/expo-playground';
      let targetPath = redirectUrl;
      if (targetPath.startsWith(basename)) {
        targetPath = targetPath.substring(basename.length) || '/';
      }

      console.log('Target path for router:', targetPath);

      // 使用 window.history.replaceState 替换当前历史记录
      window.history.replaceState(null, '', redirectUrl);
    } else {
      // 如果路径已经匹配，清除重定向标记
      sessionStorage.removeItem('spa_redirect_url');
    }
  }
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
