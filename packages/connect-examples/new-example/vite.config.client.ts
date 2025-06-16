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
  base: process.env.NODE_ENV === 'production' ? '/new-example/' : '/',

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
    sourcemap: process.env.NODE_ENV !== 'production', // 生产环境禁用sourcemap
    // 增加chunk大小警告阈值
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // 优化的chunk分割策略
        manualChunks: id => {
          // React 相关库
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-i18next')) {
            return 'react-vendor';
          }
          // OneKey SDK 相关库
          if (id.includes('@onekeyfe')) {
            return 'onekey-sdk';
          }
          // UI 组件库
          if (id.includes('@radix-ui/') || id.includes('lucide-react')) {
            return 'ui-vendor';
          }
          // Node.js polyfills - 分离到不同的 chunks 避免循环依赖
          if (id.includes('buffer') && !id.includes('stream-browserify')) {
            return 'buffer-polyfill';
          }
          if (id.includes('process') && !id.includes('stream-browserify')) {
            return 'process-polyfill';
          }
          if (id.includes('stream-browserify')) {
            return 'stream-polyfill';
          }
          if (
            id.includes('util') &&
            !id.includes('stream-browserify') &&
            !id.includes('buffer') &&
            !id.includes('process')
          ) {
            return 'util-polyfill';
          }
          if (
            id.includes('events') &&
            !id.includes('stream-browserify') &&
            !id.includes('buffer') &&
            !id.includes('process')
          ) {
            return 'events-polyfill';
          }
          // 工具库
          if (
            id.includes('clsx') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('zustand') ||
            id.includes('i18next')
          ) {
            return 'utils';
          }
          // 方法数据文件 - 更精确的匹配
          if (id.includes('/data/methods/') || id.includes('/data/methodsRegistry')) {
            return 'methods-data';
          }
          // 其他数据文件
          if (id.includes('/data/')) {
            return 'app-data';
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
  },

  // 优化依赖处理 - 确保 polyfill 被预构建
  optimizeDeps: {
    include: [
      // React 相关
      'react',
      'react-dom',
      'react-i18next',
      // OneKey SDK
      '@onekeyfe/hd-web-sdk',
      '@onekeyfe/hd-core',
      '@onekeyfe/hd-shared',
      // Node.js polyfills - 分别预构建避免循环依赖
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
    ],
    // 排除某些不需要预构建的模块
    // exclude: ['@onekeyfe/hd-core/dist/cjs'],
    // 强制重新构建以确保配置生效
    force: true,
  },

  // 预览服务器配置
  preview: {
    port: 3001,
    host: true,
  },
});
