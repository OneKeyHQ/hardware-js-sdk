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
        host_passphrase: {
          passphrase: '[REDACTED]',
        },
        passphrase_on_device: {},
      },
      sessionId: '[REDACTED]',
      useEmptyPassphrase: false,
    });
    expect(JSON.stringify(entry.data)).not.toContain('do-not-log-this');
    expect(JSON.stringify(entry.data)).not.toContain('do-not-log-this-session');
  });

  test('标准钱包和隐藏钱包都保留 passphraseState', () => {
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
      passphraseState: null,
    });
    expect(hiddenEntry.data).toEqual({
      walletType: 'hidden',
      passphraseState: 'wallet-identifier',
    });
  });
});
