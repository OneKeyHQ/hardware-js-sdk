import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],

  // 配置入口文件
  root: '.',
  publicDir: 'public',

  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __COMMIT_SHA__: JSON.stringify(process.env.VITE_COMMIT_SHA || 'dev'),
  },

  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
      ...(process.env.NODE_ENV === 'production'
        ? {
            '@onekeyfe/hd-core': path.resolve(__dirname, '../../core/src'),
            '@onekeyfe/hd-shared': path.resolve(__dirname, '../../shared/src'),
            '@onekeyfe/hd-web-sdk': path.resolve(__dirname, '../../hd-web-sdk/src'),
            '@onekeyfe/hd-transport': path.resolve(__dirname, '../../hd-transport/src'),
          }
        : {}),

      // Node.js polyfills for OneKey SDK
      stream: 'stream-browserify',
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      events: 'events',
      crypto: 'crypto-browserify',
      path: 'path-browserify',
      os: 'os-browserify/browser',
    },
  },

  // 关键：正确处理 OneKey SDK 的 CommonJS 依赖
  optimizeDeps: {
    include: [
      // React 生态
      'react',
      'react-dom',
      'react-router-dom',

      // OneKey SDK packages - 使用 npm 包而非源码
      '@onekeyfe/hd-web-sdk',
      '@onekeyfe/hd-shared',
      '@onekeyfe/hd-core',

      // Node.js polyfills
      'buffer',
      'stream-browserify',
      'util',
      'events',
      'crypto-browserify',
      'path-browserify',
      'os-browserify/browser',
      'process/browser',
    ],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      define: {
        global: 'globalThis',
      },
      keepNames: true,
    },
  },

  build: {
    target: 'es2020',
    sourcemap: true,
    outDir: 'dist',

    // 处理 CommonJS 模块
    commonjsOptions: {
      include: [/node_modules/, /@onekeyfe/],
      transformMixedEsModules: true,
      strictRequires: true,
      ignoreDynamicRequires: false,
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // 分离 vendor chunks 以优化缓存
          react: ['react', 'react-dom', 'react-router-dom'],
          onekey: ['@onekeyfe/hd-web-sdk', '@onekeyfe/hd-shared', '@onekeyfe/hd-core'],
        },
      },
    },
  },

  server: {
    port: 3000,
    host: true,
  },
});
