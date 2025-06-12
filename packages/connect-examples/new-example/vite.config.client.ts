import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: process.cwd(),
  // Set the base path to the repository name + sub-directory for a robust deployment
  base: '/hardware-js-sdk/new-example/',

  plugins: [react(), tsconfigPaths()],

  define: {
    global: 'globalThis',
    // 注入环境变量
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    // 将 commit SHA 注入到应用中
    __COMMIT_SHA__: JSON.stringify(process.env.VITE_COMMIT_SHA || 'dev'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
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
    sourcemap: false, // 禁用sourcemap减少文件数量
    rollupOptions: {
      output: {
        // 减少代码拆分，将更多代码打包到主要chunk中
        manualChunks: {
          // 将所有vendor代码打包到一个文件
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // 将SDK相关代码打包到一个文件，但确保 polyfill 在 entry 中
          sdk: ['@onekeyfe/hd-web-sdk', '@onekeyfe/hd-core', '@onekeyfe/hd-shared'],
          // 将UI组件打包到一个文件
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-checkbox', '@radix-ui/react-select'],
          // 注意：不要将 polyfill 单独打包，让它们留在 entry chunk 中
          // polyfill: ['buffer', 'process', 'stream-browserify', 'util', 'events'],
        },
        // 设置更大的chunk大小限制，减少文件拆分
        chunkFileNames: chunkInfo => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.js', '')
            : 'chunk';
          const commitSha = process.env.VITE_COMMIT_SHA ? `-${process.env.VITE_COMMIT_SHA}` : '';
          return `assets/${facadeModuleId}${commitSha}-[hash].js`;
        },
        assetFileNames: (() => {
          const commitSha = process.env.VITE_COMMIT_SHA ? `-${process.env.VITE_COMMIT_SHA}` : '';
          return `assets/[name]${commitSha}-[hash].[ext]`;
        })(),
        entryFileNames: () => {
          const commitSha = process.env.VITE_COMMIT_SHA ? `-${process.env.VITE_COMMIT_SHA}` : '';
          return `assets/[name]${commitSha}-[hash].js`;
        },
      },
    },
    // 增加chunk大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 确保 Node.js polyfill 被正确处理
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/, /buffer/, /process/, /stream-browserify/, /util/, /events/],
    },
  },

  server: {
    port: 3000,
    host: true,
  },

  // 优化依赖处理 - 确保 polyfill 被预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@onekeyfe/hd-web-sdk',
      '@onekeyfe/hd-core',
      '@onekeyfe/hd-shared',
      'buffer',
      'process/browser',
      'stream-browserify',
      'util',
      'events',
    ],
    // 强制预构建这些模块，确保 polyfill 正确处理
    force: true,
  },
});
