import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const WALLET_METHODS = [
  'deviceUnlock',
  'deviceLock',
  'deviceStatusGet',
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
});
