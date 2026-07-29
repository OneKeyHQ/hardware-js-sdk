import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const readPlaygroundSource = (relativePath: string) =>
  readFileSync(
    resolve(process.cwd(), 'packages/connect-examples/expo-playground/app', relativePath),
    'utf8'
  );

describe('expo-playground 钱包选择模式', () => {
  test('Passphrase 请求只打开 Passphrase 输入窗口', () => {
    const source = readPlaygroundSource('components/providers/SDKProvider.tsx');

    expect(source).toContain('globalDialogManager?.showPassphraseDialog()');
    expect(source).not.toContain('existsAttachPinUser');
    expect(source).not.toContain('PLAYGROUND_MOCK_PASSPHRASE');
  });

  test('钱包 Session 页面使用统一隐藏钱包选择模式', () => {
    const source = readPlaygroundSource('routes/wallet-session-test.tsx');

    expect(source).toContain("mode: 'select-hidden'");
    expect(source).not.toContain("mode: 'hidden'");
    expect(source).not.toContain("access: 'attach-pin'");
    expect(source).not.toContain('submitAttachPin');
  });

  test('调用参数准备阶段不再强制切换到隐藏钱包', () => {
    const source = readPlaygroundSource('services/hardwareService.ts');

    expect(source).not.toContain('PLAYGROUND_MOCK_HIDDEN_WALLET');
    expect(source).not.toContain('params.useEmptyPassphrase = false;');
    expect(source).toContain('if (params.useEmptyPassphrase === true)');
  });
});
