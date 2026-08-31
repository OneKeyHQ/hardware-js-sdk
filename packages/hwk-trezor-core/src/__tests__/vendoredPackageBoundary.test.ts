import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../..');
const packagesRoot = resolve(repoRoot, 'packages');

const vendoredPackages = [
  'hwk-trezor-protobuf',
  'hwk-trezor-protocol',
  'hwk-trezor-schema-utils',
  'hwk-trezor-transport',
  'hwk-trezor-transport-common',
  'hwk-trezor-transport-web',
  'hwk-trezor-type-utils',
  'hwk-trezor-utils',
];

type PackageJson = {
  private?: boolean;
  publishConfig?: unknown;
  exports?: Record<string, unknown>;
};

const readJson = <T>(path: string) => JSON.parse(readFileSync(path, 'utf8')) as T;

describe('vendored Trezor package boundary', () => {
  test('keeps only the required wrapper entries outside Trezor src', () => {
    const protobufPackage = readJson<PackageJson>(
      resolve(packagesRoot, 'hwk-trezor-protobuf/package.json')
    );
    const protocolPackage = readJson<PackageJson>(
      resolve(packagesRoot, 'hwk-trezor-protocol/package.json')
    );
    const transportPackage = readJson<PackageJson>(
      resolve(packagesRoot, 'hwk-trezor-transport/package.json')
    );

    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-protobuf/hwk.ts'))).toBe(true);
    expect(protobufPackage.exports?.['./hwk']).toBeDefined();
    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-protobuf/core.ts'))).toBe(false);
    expect(protobufPackage.exports?.['./core']).toBeUndefined();

    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-transport/hwk.ts'))).toBe(true);
    expect(transportPackage.exports?.['./hwk']).toBeDefined();
    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-transport/core.ts'))).toBe(false);
    expect(transportPackage.exports?.['./core']).toBeUndefined();

    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-protocol/core.ts'))).toBe(false);
    expect(protocolPackage.exports?.['./core']).toBeUndefined();
    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-protocol/hwk.ts'))).toBe(false);
    expect(protocolPackage.exports?.['./hwk']).toBeUndefined();

    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-transport/basic.ts'))).toBe(false);
    expect(transportPackage.exports?.['./basic']).toBeUndefined();
  });

  test('keeps Buffer compatibility in core runtime instead of replacing THP loop', () => {
    const transportHwk = readFileSync(resolve(packagesRoot, 'hwk-trezor-transport/hwk.ts'), 'utf8');
    const coreTsup = readFileSync(resolve(packagesRoot, 'hwk-trezor-core/tsup.config.ts'), 'utf8');
    const runtimeBuffer = readFileSync(
      resolve(packagesRoot, 'hwk-trezor-core/src/runtime/buffer.ts'),
      'utf8'
    );

    expect(existsSync(resolve(packagesRoot, 'hwk-trezor-transport/hwk-receive.ts'))).toBe(false);
    // `receive` moved to hwk-trezor-transport-common as part of mirroring upstream's
    // v26.7.4 transport -> transport/transport-common/transport-web split; hwk.ts now
    // forwards from there instead of a local relative path.
    expect(transportHwk).toContain('@onekeyfe/hwk-trezor-transport-common');
    expect(transportHwk).not.toContain('enum ThpLoopState');
    expect(transportHwk).not.toContain('const thpLoop');
    expect(coreTsup).not.toContain('../utils/receive');
    expect(runtimeBuffer).toContain('installBufferRuntime');
  });

  test('lint and test exclude vendored Trezor package containers', () => {
    // Lint/test/publish skip vendored package containers. Public SDK packages
    // bundle the required vendored source through tsup aliases instead of
    // publishing these upstream mirrors as standalone packages.
    const eslintIgnore = readFileSync(resolve(repoRoot, '.eslintignore'), 'utf8');
    const rootPackage = readJson<{ scripts?: Record<string, string> }>(
      resolve(repoRoot, 'package.json')
    );

    for (const packageName of vendoredPackages) {
      expect(eslintIgnore).toContain(`packages/${packageName}/`);
      expect(rootPackage.scripts?.test).toContain(`--ignore @onekeyfe/${packageName}`);
      expect(rootPackage.scripts?.['publish-packages']).toContain(
        `--ignore @onekeyfe/${packageName}`
      );
    }
  });

  test('vendored Trezor package containers stay private', () => {
    for (const packageName of vendoredPackages) {
      const packageJson = readJson<PackageJson & { version?: string }>(
        resolve(packagesRoot, packageName, 'package.json')
      );

      expect(packageJson.private).toBe(true);
      expect(packageJson.publishConfig).toBeUndefined();
      expect(typeof packageJson.version).toBe('string');
    }
  });

  test('lint-staged does not autofix vendored Trezor package files', () => {
    const lintStagedConfig = require(resolve(repoRoot, '.lintstagedrc.js')) as {
      '*.{js,jsx,ts,tsx}': (files: string[]) => string[];
    };
    const commands = lintStagedConfig['*.{js,jsx,ts,tsx}']([
      resolve(packagesRoot, 'hwk-trezor-protobuf/src/index.ts'),
      resolve(packagesRoot, 'hwk-trezor-transport/src/index.ts'),
      resolve(packagesRoot, 'hwk-trezor-core/src/index.ts'),
    ]);

    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain('hwk-trezor-core/src/index.ts');
    expect(commands[0]).not.toContain('hwk-trezor-protobuf/src/index.ts');
    expect(commands[0]).not.toContain('hwk-trezor-transport/src/index.ts');
  });
});
