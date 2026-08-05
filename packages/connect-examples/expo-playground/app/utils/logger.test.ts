import { describe, expect, jest, test } from '@jest/globals';

jest.mock('../store/deviceStore', () => {
  const useDeviceStore = () => ({});
  useDeviceStore.getState = () => ({
    addLog: () => undefined,
  });
  return { useDeviceStore };
});

import { createUnifiedLogEntry } from './logger';

describe('createUnifiedLogEntry', () => {
  test('递归隐藏主机侧口令，但保留非敏感的钱包选择参数', () => {
    const entry = createUnifiedLogEntry('request', 'Wallet session', {
      select: {
        host_passphrase: {
          passphrase: 'do-not-log-this',
        },
        passphrase_on_device: {},
      },
      sessionId: 'do-not-log-this-session',
      useEmptyPassphrase: false,
    });

    expect(entry.data).toEqual({
      select: {
        host_passphrase: '[Redacted]',
        passphrase_on_device: '[Redacted]',
      },
      sessionId: '[Redacted]',
      useEmptyPassphrase: '[Redacted]',
    });
    expect(JSON.stringify(entry.data)).not.toContain('do-not-log-this');
    expect(JSON.stringify(entry.data)).not.toContain('do-not-log-this-session');
  });

  test('标准钱包保留空钱包标识，隐藏钱包标识继续脱敏', () => {
    const standardEntry = createUnifiedLogEntry('response', 'Standard wallet', {
      walletType: 'standard',
      passphraseState: null,
    });
    const hiddenEntry = createUnifiedLogEntry('response', 'Hidden wallet', {
      walletType: 'hidden',
      passphraseState: 'wallet-identifier',
    });

    expect(standardEntry.data).toEqual({
      walletType: 'standard',
      passphraseState: '[Redacted]',
    });
    expect(hiddenEntry.data).toEqual({
      walletType: 'hidden',
      passphraseState: '[Redacted]',
    });
  });
});
