import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const readPlaygroundSource = (relativePath: string) =>
  readFileSync(
    resolve(process.cwd(), 'packages/connect-examples/expo-playground/app', relativePath),
    'utf8'
  );

describe('expo-playground 临时隐藏钱包 mock 模式', () => {
  test('Passphrase 请求统一使用非空 mock 值，不再弹出选择窗口', () => {
    const source = readPlaygroundSource('components/providers/SDKProvider.tsx');

    expect(source).toContain('PLAYGROUND_MOCK_PASSPHRASE');
    expect(source).toContain('submitPassphrase(PLAYGROUND_MOCK_PASSPHRASE, false, true)');
    expect(source).not.toContain('window.globalDialogManager?.showPassphraseDialog();');
  });

  test('Pro2 联调 mock 不覆盖显式的标准钱包选择', () => {
    const source = readPlaygroundSource('services/hardwareService.ts');

    expect(source).toContain('params.useEmptyPassphrase = false;');
    expect(source).toContain('PLAYGROUND_MOCK_HIDDEN_WALLET');
    expect(source).toContain('currentDevice.deviceType === EDeviceType.Pro2');
    expect(source).toContain('params.useEmptyPassphrase !== true');
  });
});
