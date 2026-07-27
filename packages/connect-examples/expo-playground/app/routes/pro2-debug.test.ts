import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const WALLET_METHODS = [
  'deviceUnlock',
  'deviceLock',
  'deviceGetOnboardingStatus',
  'openWalletSession',
  'deviceCancel',
];

const NATIVE_QUERY_METHODS = ['deviceInfoGet', 'deviceStatusGet'];

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

  test('只在 Pro2 Debug 中提供原生状态查询入口', () => {
    expect(source).toContain("import { pro2Debug } from '../data/methods/pro2Debug'");
    expect(source).toContain('...pro2Debug.api');
    NATIVE_QUERY_METHODS.forEach(method => {
      expect(source).toContain(`'${method}'`);
      expect(source).toContain(`${method}: {`);
    });
  });

  test('设置分组只使用统一 deviceSettings 入口', () => {
    expect(source).toContain("'deviceSettings'");
    expect(source).not.toContain("'deviceSettingsGet'");
    expect(source).not.toContain("'deviceSettingsSet'");
    expect(source).not.toContain("'deviceSettingsPageShow'");
  });

  test('钱包标识不写入协议调试日志', () => {
    expect(source).toContain("passphraseState: '[REDACTED]'");
  });

  test('统一状态说明包含默认实时 status 和可选业务 scope', () => {
    expect(source).toContain('Default: DeviceStatusGet in normal mode');
    expect(source).toContain('firmware: full DeviceInfoGet');
    expect(source).toContain('settings: DeviceSettingsGet');
    expect(source).toContain('loader mode: DeviceInfoGet only');
    expect(source).not.toContain("'refreshDeviceState'");
  });

  test('解锁说明包含状态刷新和 canonical DeviceState', () => {
    expect(source).toContain("tx: '60608 (DeviceSessionAskPin)',");
    expect(source).toContain("rx: '60207 (Success), followed by 60603 (DeviceStatus)',");
    expect(source).toContain("decoded: 'Canonical DeviceState with unlocked=true'");
  });
});
