import { DeviceJobQueue, HardwareErrorCode, success } from '@onekeyfe/hwk-adapter-core';

import { createAllNetworkGetAddress } from '../adapter/methods/allNetworkGetAddress';

import type { LedgerCallChain } from '../adapter/methods/allNetworkGetAddress';

const CONNECT_ID = 'ledger-connect-1';

const BUNDLE = [
  { network: 'evm', methodName: 'evmGetAddress' as const, path: "m/44'/60'/0'/0/0", chainId: 1 },
  { network: 'sol', methodName: 'solGetAddress' as const, path: "m/44'/501'/0'/0'" },
  { network: 'tron', methodName: 'tronGetAddress' as const, path: "m/44'/195'/0'/0/0" },
];

describe('Ledger allNetworkGetAddress cancellation', () => {
  it('stops the bundle when cancel lands between two items', async () => {
    const queue = new DeviceJobQueue();
    const chainsSentToDevice: string[] = [];
    const userAborted = Object.assign(new Error('User aborted operation'), {
      code: HardwareErrorCode.UserAborted,
    });

    const callChain: LedgerCallChain = (async (
      _connectId: string,
      _deviceId: string,
      chain: string
    ) => {
      // Each item is its own queue job, so it runs to completion and leaves the
      // queue empty. The cancel below lands in that gap: no job to abort.
      const result = await queue.enqueue(CONNECT_ID, async () => {
        chainsSentToDevice.push(chain);
        return success({ address: `0x${chain}`, path: "m/44'/60'/0'/0/0" });
      });
      if (chainsSentToDevice.length === 1) {
        expect(queue.getActiveJob()).toBeNull();
        queue.cancelActiveAndPending(CONNECT_ID, userAborted);
      }
      return result;
    }) as unknown as LedgerCallChain;

    const allNetworkGetAddress = createAllNetworkGetAddress({
      callChain,
      getChainFingerprint: async () => success('fingerprint-1'),
      retainOperation: () => () => undefined,
      errorToFailure: <T>(error: unknown) => {
        throw error;
      },
      createCancelScope: queueKey => queue.createCancelScope(queueKey),
    });

    const result = await allNetworkGetAddress(CONNECT_ID, '', { bundle: BUNDLE });

    expect(chainsSentToDevice).toEqual(['evm']);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.payload.code).toBe(HardwareErrorCode.UserAborted);
      expect(result.payload.error).toBe('User aborted operation');
    }
  });

  it('releases the cancel scope when the bundle finishes', async () => {
    const queue = new DeviceJobQueue();
    const callChain: LedgerCallChain = (async (
      _connectId: string,
      _deviceId: string,
      chain: string
    ) => success({ address: `0x${chain}` })) as unknown as LedgerCallChain;

    const allNetworkGetAddress = createAllNetworkGetAddress({
      callChain,
      getChainFingerprint: async () => success('fingerprint-1'),
      retainOperation: () => () => undefined,
      errorToFailure: <T>(error: unknown) => {
        throw error;
      },
      createCancelScope: queueKey => queue.createCancelScope(queueKey),
    });

    const result = await allNetworkGetAddress(CONNECT_ID, '', { bundle: BUNDLE });
    expect(result.success).toBe(true);

    // Nothing left registered, so a late cancel finds no scope to abort.
    expect(queue.cancelActiveAndPending(CONNECT_ID, new Error('late'))).toBe(false);
  });
});
