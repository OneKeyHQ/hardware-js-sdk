import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

const aliases: Record<string, string> = {
  '@trezor/schema-utils': resolve(__dirname, '../hwk-trezor-schema-utils/src/index.ts'),
  '@trezor/type-utils': resolve(__dirname, '../hwk-trezor-type-utils/src/index.ts'),
};

const aliasPlugin = {
  name: 'hwk-trezor-protobuf-alias',
  setup(build: {
    onResolve(
      options: { filter: RegExp },
      callback: (args: { path: string }) => { path: string } | undefined,
    ): void;
  }) {
    build.onResolve({ filter: /.*/ }, args => {
      const alias = aliases[args.path];
      return alias ? { path: alias } : undefined;
    });
  },
};

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    hwk: 'hwk.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: ['@trezor/schema-utils', '@trezor/type-utils'],
  esbuildPlugins: [aliasPlugin],
});
