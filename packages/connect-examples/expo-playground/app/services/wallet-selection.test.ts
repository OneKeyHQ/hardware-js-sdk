import { readFileSync } from 'fs';
import { resolve } from 'path';

import { describe, expect, test } from '@jest/globals';

const readPlaygroundSource = (relativePath: string) =>
  readFileSync(
    resolve(process.cwd(), 'packages/connect-examples/expo-playground/app', relativePath),
    'utf8'
  );

describe('expo-playground 钱包选择模式', () => {
  test('Passphrase 请求通过统一钱包选择窗口传递 Host、设备输入与 Attach PIN 能力', () => {
    const source = readPlaygroundSource('components/providers/SDKProvider.tsx');

    expect(source).toContain('globalDialogManager?.showPassphraseDialog({');
    expect(source).toContain('deviceOnly: message.payload?.deviceOnly === true');
    expect(source).toContain('existsAttachPinUser: message.payload?.existsAttachPinUser === true');
    expect(source).toContain("message.payload?.source === 'wallet-session-coordinator'");
    expect(source).not.toContain('PLAYGROUND_MOCK_PASSPHRASE');
  });

  test('deviceOnly=false 时保留 Host Passphrase 表单和提交路径', () => {
    const source = readPlaygroundSource('components/global/PassphraseDialog.tsx');

    expect(source).toContain('{!deviceOnly ? <');
    expect(source).toContain('id="passphrase-input"');
    expect(source).toContain('id="confirm-passphrase"');
    expect(source).toContain("passphrase.normalize('NFKD')");
    expect(source).toContain("await submitPassphrase('', true)");
    expect(source).toContain("await submitPassphrase('', false, false, true)");
    expect(source).toContain('PASSPHRASE_PATTERN.test(passphrase)');
    expect(source).toContain('isProtocolV2PassphraseValid(passphrase)');
    expect(source).toContain('1–50 UTF-8 bytes without NUL');
    expect(source).toContain('1–50 printable ASCII characters');
  });

  test('钱包 Session 页面使用统一隐藏钱包选择模式', () => {
    const source = readPlaygroundSource('routes/wallet-session-test.tsx');

    expect(source).toContain("mode: 'select-hidden'");
    expect(source).not.toContain("mode: 'hidden'");
    expect(source).not.toContain("access: 'attach-pin'");
    expect(source).not.toContain('submitAttachPin');
  });

  test('Passphrase 弹窗在 Attach PIN 模式下不会横向溢出', () => {
    const source = readPlaygroundSource('components/global/PassphraseDialog.tsx');

    expect(source).toContain('w-[calc(100vw-2rem)] max-w-sm');
    expect(source).toContain('w-full max-w-full min-w-0 box-border');
    expect(source).toContain('grid grid-cols-2 gap-2');
    expect(source).toContain('whitespace-normal');
  });

  test('调用参数准备阶段不再强制切换到隐藏钱包', () => {
    const source = readPlaygroundSource('services/hardwareService.ts');

    expect(source).not.toContain('PLAYGROUND_MOCK_HIDDEN_WALLET');
    expect(source).not.toContain('params.useEmptyPassphrase = false;');
    expect(source).toContain('if (params.useEmptyPassphrase === true)');
  });
});
