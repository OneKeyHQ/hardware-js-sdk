import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const appRoot = resolve(process.cwd(), 'packages/connect-examples/expo-playground/app');
const readAppFile = (relativePath: string) => readFileSync(resolve(appRoot, relativePath), 'utf8');

describe('设备连接错误展示', () => {
  test.each([
    'components/common/TransportSwitcher.tsx',
    'components/common/DeviceNotConnectedState.tsx',
    'routes/_index.tsx',
  ])('%s 不把 SDK 原始错误直接展示给用户', relativePath => {
    const source = readAppFile(relativePath);

    expect(source).not.toMatch(/(?:searchResult|result)\.payload\?\.error/);
    expect(source).not.toMatch(/error instanceof Error \? error\.message/);
    expect(source).not.toMatch(/description:\s*sdkInitState\.error/);
    expect(source).not.toMatch(/console\.error/);
  });
});
