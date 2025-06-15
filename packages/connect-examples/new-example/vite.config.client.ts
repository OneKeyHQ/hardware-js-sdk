import { defineConfig, type UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

// 自定义插件：确保 shim.js 优先加载
function shimPlugin() {
  return {
    name: 'shim-plugin',
    config(config: UserConfig) {
      // 确保 shim.js 在所有模块之前加载
      config.define = config.define || {};
      config.define['global'] = 'globalThis';
    },
  };
}

export default defineConfig({
  root: process.cwd(),
  // Set the base path to the repository name + sub-directory for a robust deployment
  base: process.env.NODE_ENV === 'production' ? '/hardware-js-sdk/new-example/' : '/',

  plugins: [react(), tsconfigPaths(), shimPlugin()],

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
    sourcemap: true, // 禁用sourcemap减少文件数量
    rollupOptions: {
      output: {
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
      'stream-browserify',
      'util',
      'events',
    ],
    // 强制预构建这些模块，确保 polyfill 正确处理
    force: true,
  },
});
