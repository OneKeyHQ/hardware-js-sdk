import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const readPlaygroundSource = (relativePath: string) =>
  readFileSync(
    resolve(process.cwd(), 'packages/connect-examples/expo-playground/app', relativePath),
    'utf8'
  );

describe('expo-playground 钱包选择模式', () => {
  test('Passphrase 请求交给用户选择窗口处理', () => {
    const source = readPlaygroundSource('components/providers/SDKProvider.tsx');

    expect(source).toContain('window.globalDialogManager?.showPassphraseDialog({');
    expect(source).toContain('existsAttachPinUser: message.payload.existsAttachPinUser === true');
    expect(source).not.toContain('PLAYGROUND_MOCK_PASSPHRASE');
  });

  test('调用参数准备阶段不再强制切换到隐藏钱包', () => {
    const source = readPlaygroundSource('services/hardwareService.ts');

    expect(source).not.toContain('PLAYGROUND_MOCK_HIDDEN_WALLET');
    expect(source).not.toContain('params.useEmptyPassphrase = false;');
    expect(source).toContain('if (params.useEmptyPassphrase === true)');
  });
});
