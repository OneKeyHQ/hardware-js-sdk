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
      useEmptyPassphrase: false,
    });

    expect(entry.data).toEqual({
      select: {
        host_passphrase: {
          passphrase: '[REDACTED]',
        },
        passphrase_on_device: {},
      },
      useEmptyPassphrase: false,
    });
    expect(JSON.stringify(entry.data)).not.toContain('do-not-log-this');
  });
});
