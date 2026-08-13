import { defineConfig } from 'tsup';
import { resolve } from 'node:path';

const aliases: Record<string, string> = {
  '@trezor/protobuf': resolve(__dirname, '../hwk-trezor-protobuf/src/index.ts'),
  '@trezor/protocol': resolve(__dirname, '../hwk-trezor-protocol/src/index.ts'),
  '@trezor/protocol/src/errors': resolve(__dirname, '../hwk-trezor-protocol/src/errors.ts'),
  '@trezor/protocol/src/protocol-v2/constants': resolve(
    __dirname,
    '../hwk-trezor-protocol/src/protocol-v2/constants.ts'
  ),
  '@trezor/schema-utils': resolve(__dirname, '../hwk-trezor-schema-utils/src/index.ts'),
  '@trezor/type-utils': resolve(__dirname, '../hwk-trezor-type-utils/src/index.ts'),
  '@trezor/utils': resolve(__dirname, '../hwk-trezor-utils/src/index.ts'),
  '@onekeyfe/hwk-trezor-protobuf': resolve(__dirname, '../hwk-trezor-protobuf/src/index.ts'),
  '@onekeyfe/hwk-trezor-protobuf/hwk': resolve(__dirname, '../hwk-trezor-protobuf/hwk.ts'),
  '@onekeyfe/hwk-trezor-protocol': resolve(__dirname, '../hwk-trezor-protocol/src/index.ts'),
  '@onekeyfe/hwk-trezor-schema-utils': resolve(
    __dirname,
    '../hwk-trezor-schema-utils/src/index.ts'
  ),
  '@onekeyfe/hwk-trezor-transport': resolve(__dirname, '../hwk-trezor-transport/src/index.ts'),
  '@onekeyfe/hwk-trezor-transport/hwk': resolve(__dirname, '../hwk-trezor-transport/hwk.ts'),
  '@onekeyfe/hwk-trezor-transport-common': resolve(
    __dirname,
    '../hwk-trezor-transport-common/src/index.ts'
  ),
  '@onekeyfe/hwk-trezor-type-utils': resolve(__dirname, '../hwk-trezor-type-utils/src/index.ts'),
  '@onekeyfe/hwk-trezor-utils': resolve(__dirname, '../hwk-trezor-utils/src/index.ts'),
  crypto: resolve(__dirname, 'src/runtime/crypto.ts'),
  'node:crypto': resolve(__dirname, 'src/runtime/crypto.ts'),
};

const aliasPlugin = {
  name: 'hwk-trezor-core-alias',
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
  platform: 'browser',
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: [
    '@onekeyfe/hwk-trezor-protobuf',
    '@onekeyfe/hwk-trezor-protocol',
    '@onekeyfe/hwk-trezor-schema-utils',
    '@onekeyfe/hwk-trezor-transport',
    '@onekeyfe/hwk-trezor-transport-common',
    '@onekeyfe/hwk-trezor-type-utils',
    '@onekeyfe/hwk-trezor-utils',
    '@trezor/protobuf',
    '@trezor/protocol',
    '@trezor/schema-utils',
    '@trezor/transport',
    '@trezor/type-utils',
    '@trezor/utils',
    '@noble/ciphers',
    '@noble/hashes',
    'buffer',
  ],
  esbuildPlugins: [aliasPlugin],
  esbuildOptions(options) {
    options.inject = [...(options.inject ?? []), resolve(__dirname, 'src/runtime/buffer.ts')];
  },
});
