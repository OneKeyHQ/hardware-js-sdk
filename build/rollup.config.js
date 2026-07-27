import typescriptPlugin from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';
import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import ts from 'typescript';

function createTypescriptPlugin() {
  const watchers = new Set();

  const trackWatcher = watcher => {
    if (!watcher || typeof watcher.close !== 'function') return watcher;
    watchers.add(watcher);
    return {
      close() {
        watchers.delete(watcher);
        watcher.close();
      },
    };
  };

  const trackedSys = {
    ...ts.sys,
    watchFile(...args) {
      return trackWatcher(ts.sys.watchFile(...args));
    },
    watchDirectory(...args) {
      return trackWatcher(ts.sys.watchDirectory(...args));
    },
  };

  const trackedTypescript = new Proxy(ts, {
    get(target, property, receiver) {
      if (property === 'sys') return trackedSys;
      return Reflect.get(target, property, receiver);
    },
  });

  const plugin = typescriptPlugin({ typescript: trackedTypescript });

  const closeWatchers = () => {
    for (const watcher of Array.from(watchers)) {
      watcher.close();
      watchers.delete(watcher);
    }
  };

  return {
    ...plugin,
    buildEnd(...args) {
      const result = plugin.buildEnd?.apply(this, args);
      if (!this.meta.watchMode) closeWatchers();
      return result;
    },
    closeBundle(...args) {
      const result = plugin.closeBundle?.apply(this, args);
      if (!this.meta.watchMode) closeWatchers();
      return result;
    },
  };
}

const config = [
  {
    input: path.resolve('./src/index.ts'),
    output: [
      {
        dir: 'dist',
        format: 'cjs',
      },
    ],
    plugins: [createTypescriptPlugin(), commonjs(), json()],
  },
  {
    input: path.resolve('./src/index.ts'),
    output: { file: 'dist/index.d.ts', format: 'es' },
    // Preserve API JSDoc tags such as @deprecated in published declarations.
    plugins: [dts({ compilerOptions: { removeComments: false } })],
  },
];

export default config;
