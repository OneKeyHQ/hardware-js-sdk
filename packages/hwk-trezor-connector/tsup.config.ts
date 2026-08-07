import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

const aliases: Record<string, string> = {
  '@onekeyfe/hwk-trezor-protobuf': resolve(__dirname, '../hwk-trezor-protobuf/src/index.ts'),
  '@onekeyfe/hwk-trezor-schema-utils': resolve(
    __dirname,
    '../hwk-trezor-schema-utils/src/index.ts'
  ),
};

const aliasPlugin = {
  name: 'hwk-trezor-connector-alias',
  setup(build: {
    onResolve(
      options: { filter: RegExp },
      callback: (args: { path: string }) => { path: string } | undefined
    ): void;
  }) {
    build.onResolve({ filter: /.*/ }, args => {
      const alias = aliases[args.path];
      return alias ? { path: alias } : undefined;
    });
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@onekeyfe/hwk-adapter-core',
    '@onekeyfe/hwk-trezor-core',
    '@onekeyfe/hwk-trezor-protocol',
  ],
  esbuildPlugins: [aliasPlugin],
});
