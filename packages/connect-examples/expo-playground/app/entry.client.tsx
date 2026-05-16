/**
 * 客户端入口文件
 *
 * 使用 react-router-dom 进行纯客户端渲染
 */

// 先导入 shim 以确保 Node.js polyfills 在应用其余部分之前加载
import './utils/shim.js';

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom';
import { SDKProvider } from './components/providers/SDKProvider';
import { I18nProvider } from './i18n/i18n-provider';
import { CommandPalette } from './components/common/CommandPalette';
import MainLayout from './components/layout/MainLayout';
import { Toaster } from './components/ui/Toaster';
import { useTheme } from './hooks/use-theme';

// 注入构建时的提交信息，便于页面展示版本
const commitSha =
  (typeof process !== 'undefined' && process.env && process.env.COMMIT_SHA) || 'dev';
(globalThis as typeof globalThis & { __COMMIT_SHA__?: string }).__COMMIT_SHA__ = commitSha;

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
import ProDebugPage from './routes/pro-debug';
import Pro2DebugPage from './routes/pro2-debug';
import Pro2OnboardingPage from './routes/pro2-onboarding';
import MethodBatchTestPage from './routes/method-batch-test';

// Import styles
import './tailwind.css';

// 处理旧版 404 回退留下的 sessionStorage 路径，转化为 Hash 路由格式
function handleSpaRedirect() {
  const redirectUrl = sessionStorage.getItem('spa_redirect_url');

  if (!redirectUrl) {
    return;
  }

  console.log('Found legacy SPA redirect URL in sessionStorage:', redirectUrl);
  sessionStorage.removeItem('spa_redirect_url');

  try {
    const parsed = new URL(redirectUrl, window.location.origin);
    const hostingBase = window.location.pathname
      .replace(/\/index\.html?$/, '')
      .replace(/\/$/, '');
    const base = hostingBase || '';

    const originalPath = parsed.pathname;
    const subPath = originalPath.slice(base.length) || '/';
    const normalizedPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
    const hashPayload = `${normalizedPath}${parsed.search}${parsed.hash}`;
    const hashPath = hashPayload.startsWith('/') ? `#${hashPayload}` : `#/${hashPayload}`;
    const needsSlash = base ? !base.endsWith('/') : true;
    const target = `${base}${needsSlash ? '/' : ''}${hashPath}`.replace('//#', '/#');

    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
      window.location.replace(target);
      return;
    }
  } catch (error) {
    console.error('Failed to convert legacy SPA redirect URL:', error);
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

// 创建路由配置（哈希路由，兼容任意静态托管环境）
const router = createHashRouter(
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

        {
          path: 'pro-debug',
          element: <ProDebugPage />,
        },
        {
          path: 'pro2-debug',
          element: <Pro2DebugPage />,
        },
        {
          path: 'pro2-onboarding',
          element: <Pro2OnboardingPage />,
        },
        {
          path: 'method-batch-test',
          element: <MethodBatchTestPage />,
        },
      ],
    },
  ]
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
