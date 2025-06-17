import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  root: process.cwd(),
  // Set the base path to the repository name + sub-directory for a robust deployment
  base: process.env.NODE_ENV === 'production' ? '/new-example/' : '/',

  plugins: [
    react(),
    tsconfigPaths(),
    viteCommonjs({
      // 指定需要转换的文件路径
      include: [
        // OneKey SDK 源码路径
        path.resolve(__dirname, '../../shared/src/**/*'),
        path.resolve(__dirname, '../../core/src/**/*'),
        path.resolve(__dirname, '../../hd-web-sdk/src/**/*'),
        path.resolve(__dirname, '../../hd-transport/src/**/*'),
      ],
    }),
  ],

  define: {
    global: 'globalThis',
    // 注入环境变量
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    // 将 commit SHA 注入到应用中
    __COMMIT_SHA__: JSON.stringify(process.env.VITE_COMMIT_SHA || 'dev'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // 其他可能需要的全局变量
    __dirname: '""',
    __filename: '""',
  },

  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      // OneKey SDK 源码别名 - monorepo 标准做法，避免编译产物的模块格式问题
      '@onekeyfe/hd-shared': path.resolve(__dirname, '../../shared/src'),
      '@onekeyfe/hd-core': path.resolve(__dirname, '../../core/src'),
      '@onekeyfe/hd-web-sdk': path.resolve(__dirname, '../../hd-web-sdk/src'),
      '@onekeyfe/hd-transport': path.resolve(__dirname, '../../hd-transport/src'),
      // Node.js polyfills for browser
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      events: 'events',
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // sourcemap: process.env.NODE_ENV !== 'production', // 生产环境禁用sourcemap
    sourcemap: true, // 生产环境禁用sourcemap
    // 增加chunk大小警告阈值 - 现代应用可以接受更大的chunk
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // 优化的chunk分割策略 - 平衡性能和复杂度
        manualChunks: id => {
          // React 生态系统
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-i18next')) {
            return 'react-vendor';
          }
          if (id.includes('@onekeyfe/hd-shared')) {
            return 'hd-shared';
          }
          if (id.includes('@onekeyfe/hd-core')) {
            return 'hd-core';
          }
          if (id.includes('@onekeyfe/hd-web-sdk')) {
            return 'hd-web-sdk';
          }
          if (id.includes('@onekeyfe/hd-transport')) {
            return 'hd-transport';
          }

          // OneKey SDK 相关库
          if (id.includes('@onekeyfe')) {
            return 'onekey-sdk';
          }

          // UI 组件和图标库
          if (id.includes('@radix-ui/') || id.includes('lucide-react')) {
            return 'ui-vendor';
          }

          // 大型第三方库
          if (id.includes('lottie-react') || id.includes('lottie-web')) {
            return 'lottie';
          }

          // 加密相关库
          if (id.includes('@noble/') || id.includes('ripple-keypairs')) {
            return 'crypto-vendor';
          }

          // Node.js polyfills 合并处理
          if (
            id.includes('buffer') ||
            id.includes('process') ||
            id.includes('stream-browserify') ||
            id.includes('util') ||
            id.includes('events')
          ) {
            return 'node-polyfills';
          }

          // 工具库集合
          if (
            id.includes('clsx') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('zustand') ||
            id.includes('i18next')
          ) {
            return 'utils';
          }
          return undefined;
        },
        // commit hash前8位
        chunkFileNames: chunkInfo => {
          const name = chunkInfo.name || 'chunk';
          const hash = process.env.VITE_COMMIT_SHA ? process.env.VITE_COMMIT_SHA.slice(0, 8) : '';
          const suffix = hash ? `-${hash}` : '';
          return `js/${name}${suffix}.[hash].js`;
        },
        assetFileNames: assetInfo => {
          const hash = process.env.VITE_COMMIT_SHA ? process.env.VITE_COMMIT_SHA.slice(0, 8) : '';
          const suffix = hash ? `-${hash}` : '';
          const name = assetInfo.originalFileNames[0] || 'asset';

          // 根据文件类型分类存放
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name)) {
            return `images/[name]${suffix}.[hash].[ext]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
            return `fonts/[name]${suffix}.[hash].[ext]`;
          }
          if (/\.css$/i.test(name)) {
            return `css/[name]${suffix}.[hash].[ext]`;
          }
          return `assets/[name]${suffix}.[hash].[ext]`;
        },
        entryFileNames: () => {
          const hash = process.env.VITE_COMMIT_SHA ? process.env.VITE_COMMIT_SHA.slice(0, 8) : '';
          const suffix = hash ? `-${hash}` : '';
          return `js/main${suffix}.[hash].js`;
        },
      },
    },
    // 确保 Node.js polyfill 被正确处理
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /buffer/, /process/, /stream-browserify/, /util/, /events/],
    },
    // 目标环境设置
    target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
    // 压缩选项
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
  },

  server: {
    port: 3000,
    host: true,
    // 开发服务器优化
    hmr: {
      overlay: true,
    },
    // 开发时的性能优化
    fs: {
      // 允许访问工作区外的文件（monorepo 支持）
      allow: ['..'],
    },
  },

  // 优化依赖处理
  optimizeDeps: {
    // 强制预构建重要依赖
    force: process.env.NODE_ENV === 'development',
    include: [
      // React 相关
      'react',
      'react-dom',
      'react-i18next',
      // Node.js polyfills
      'buffer',
      'process/browser',
      'stream-browserify',
      'util',
      'events',
      // UI 组件
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      // 工具库
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'zustand',
      'i18next',
      'i18next-browser-languagedetector',
      // 加密库
      '@noble/hashes',
      'ripple-keypairs',
      // 动画库
      'lottie-react',
      // 图标库
      'lucide-react',
    ],
    // OneKey SDK 包现在从 node_modules 正常加载
    exclude: [
      '@onekeyfe/hd-core',
      '@onekeyfe/hd-shared',
      '@onekeyfe/hd-web-sdk',
      '@onekeyfe/hd-transport',
    ],
  },

  // 预览服务器配置
  preview: {
    port: 3001,
    host: true,
  },
});
