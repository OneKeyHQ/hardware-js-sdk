import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const WALLET_METHODS = [
  'deviceUnlock',
  'deviceLock',
  'deviceGetOnboardingStatus',
  'getPassphraseState',
  'deviceSessionOpen',
  'deviceCancel',
];

const source = readFileSync(
  resolve(process.cwd(), 'packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx'),
  'utf8'
);

describe('Pro2 Debug 钱包与状态方法', () => {
  test('在独立分组中集中展示常用钱包控制方法', () => {
    expect(source).toContain("id: 'wallet'");
    WALLET_METHODS.forEach(method => {
      expect(source).toContain(`'${method}'`);
    });
  });

  test.each(WALLET_METHODS)('为 %s 展示协议请求和响应信息', method => {
    expect(source).toContain(`${method}: {`);
  });

  test('不把原始状态和设置读取命令暴露为公共调试 API', () => {
    expect(source).not.toContain('deviceInfoGet: {');
    expect(source).not.toContain('deviceStatusGet: {');
    expect(source).not.toContain('deviceSettingsGet: {');
  });

  test('统一状态说明区分缓存读取和业务 scope 刷新', () => {
    expect(source).toContain('Cached state: no transport request');
    expect(source).toContain('basic: versions DeviceInfoGet');
    expect(source).toContain('firmware: full DeviceInfoGet');
    expect(source).toContain('settings: DeviceSettingsGet');
    expect(source).toContain('runtime: DeviceStatusGet (normal mode only)');
  });
});
