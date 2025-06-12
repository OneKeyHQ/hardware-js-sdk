import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

// 创建一个插件来注入 Buffer polyfill
function bufferPolyfillPlugin() {
  return {
    name: 'buffer-polyfill',
    // 在构建时注入 Buffer 初始化代码
    transformIndexHtml(html: string) {
      return html.replace(
        '<head>',
        `<head>
  <script type="module">
    // 确保 Buffer 在运行时可用
    if (typeof globalThis.Buffer === 'undefined') {
      try {
        import('buffer').then(({ Buffer }) => {
          globalThis.Buffer = Buffer;
          window.Buffer = Buffer;
        }).catch(e => {
          console.warn('Failed to load Buffer polyfill:', e);
        });
      } catch (e) {
        console.warn('Failed to load Buffer polyfill:', e);
      }
    }
  </script>`
      );
    },
  };
}

// 创建一个插件来处理Node.js内置模块的polyfill
function nodePolyfillPlugin() {
  const builtins: Record<string, string> = {
    stream: 'stream-browserify',
    buffer: 'buffer',
    process: 'process/browser',
    util: 'util',
    events: 'events',
  };

  return {
    name: 'node-polyfill-plugin',

    // 在解析阶段重写导入
    resolveId(source: string) {
      if (source in builtins) {
        return { id: builtins[source], external: false };
      }
      return null;
    },

    // 配置开始前
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configResolved(config: any) {
      const aliases = config.resolve.alias || {};
      for (const [key, value] of Object.entries(builtins)) {
        if (!aliases[key]) {
          aliases[key] = value;
        }
      }
    },
  };
}

export default defineConfig({
  root: process.cwd(),
  // Set the base path to the repository name + sub-directory for a robust deployment
  base: '/hardware-js-sdk/new-example/',

  plugins: [react(), tsconfigPaths(), nodePolyfillPlugin(), bufferPolyfillPlugin()],

  define: {
    global: 'globalThis',
    // 确保 process 全局可用
    'process.env': 'process.env',
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
          // 将SDK相关代码打包到一个文件
          sdk: ['@onekeyfe/hd-web-sdk', '@onekeyfe/hd-core', '@onekeyfe/hd-shared'],
          // 将UI组件打包到一个文件
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-checkbox', '@radix-ui/react-select'],
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
  },

  server: {
    port: 3000,
    host: true,
  },

  // 优化依赖处理
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@onekeyfe/hd-web-sdk',
      '@onekeyfe/hd-core',
      '@onekeyfe/hd-shared',
      'buffer',
      'process',
      'stream-browserify',
      'util',
      'events',
    ],
  },
});
