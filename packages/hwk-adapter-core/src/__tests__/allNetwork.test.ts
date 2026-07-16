import { HardwareErrorCode, runAllNetworkGetAddress, success } from '../index';

import type {
  AllNetworkAddressParams,
  AllNetworkAddressResponse,
  ChainForFingerprint,
  Response,
} from '../index';

describe('runAllNetworkGetAddress', () => {
  it('uses methodName to dispatch BTC address vs public key and lets hooks normalize params', async () => {
    const calls: Array<{ method: string; item: AllNetworkAddressParams }> = [];

    const response = await runAllNetworkGetAddress({
      connectId: 'conn-1',
      deviceId: 'device-1',
      params: {
        bundle: [
          { methodName: 'btcGetAddress', network: 'btc', path: 'addr-path' },
          { methodName: 'btcGetPublicKey', network: 'btc', path: 'xpub-path' },
        ],
      },
      normalizeItem: (method, item) =>
        method === 'btcGetAddress' || method === 'btcGetPublicKey'
          ? { ...item, coin: 'Bitcoin' }
          : item,
      callItem: async ({ method, item }) => {
        calls.push({ method, item });
        return success({ method, path: item.path });
      },
      attachIdentity: async ({ item, method, payload }) => ({
        ...item,
        success: true,
        payload: {
          ...payload,
          chainFingerprintChain: method === 'btcGetPublicKey' ? 'btc' : 'btc',
          deviceIdentity: { vendor: 'test', type: 'mock', value: 'device-1' },
        },
      }),
    });

    expect(response.success).toBe(true);
    expect(calls).toEqual([
      {
        method: 'btcGetAddress',
        item: { methodName: 'btcGetAddress', network: 'btc', path: 'addr-path', coin: 'Bitcoin' },
      },
      {
        method: 'btcGetPublicKey',
        item: {
          methodName: 'btcGetPublicKey',
          network: 'btc',
          path: 'xpub-path',
          coin: 'Bitcoin',
        },
      },
    ]);
    expect(response.payload.map(item => item.payload?.method)).toEqual([
      'btcGetAddress',
      'btcGetPublicKey',
    ]);
  });

  it('continues per-item failures but lets adapter hook abort selected errors', async () => {
    const itemFailure: AllNetworkAddressResponse = {
      methodName: 'evmGetAddress',
      network: 'eth',
      path: 'p0',
      success: false,
      payload: { code: HardwareErrorCode.AppNotInstalled, error: 'missing app' },
    };
    const abortFailure: AllNetworkAddressResponse = {
      methodName: 'solGetAddress',
      network: 'sol',
      path: 'p1',
      success: false,
      payload: { code: HardwareErrorCode.DeviceMismatch, error: 'wrong device' },
    };

    const response = await runAllNetworkGetAddress({
      connectId: 'conn-1',
      deviceId: '',
      params: {
        bundle: [
          { methodName: 'evmGetAddress', network: 'eth', path: 'p0' },
          { methodName: 'solGetAddress', network: 'sol', path: 'p1' },
        ],
      },
      callItem: async ({ method }) => {
        const failure = method === 'evmGetAddress' ? itemFailure : abortFailure;
        return { success: false, payload: failure.payload } as Response<unknown>;
      },
      attachIdentity: async ({ item, payload }) => ({
        ...item,
        success: true,
        payload,
      }),
      shouldAbortBundle: responseItem =>
        responseItem.payload?.code === HardwareErrorCode.DeviceMismatch,
    });

    expect(response).toEqual({
      success: false,
      payload: {
        code: HardwareErrorCode.DeviceMismatch,
        error: 'wrong device',
      },
    });
  });

  it('returns item failure for unsupported methods and adapter-declared unsupported networks', async () => {
    const response = await runAllNetworkGetAddress({
      connectId: 'conn-1',
      deviceId: '',
      params: {
        bundle: [
          {
            methodName: 'notSupported',
            network: 'eth',
            path: 'p0',
          } as AllNetworkAddressParams,
          { methodName: 'btcGetAddress', network: 'doge', path: 'p1' },
        ],
      },
      buildUnsupportedNetworkResponse: item =>
        item.network === 'doge'
          ? {
              ...item,
              success: false,
              payload: {
                code: HardwareErrorCode.ChainNotSupported,
                error: 'unsupported network',
              },
            }
          : undefined,
      callItem: async () => success({}),
      attachIdentity: async ({ item, payload }) => ({ ...item, success: true, payload }),
      getMethodChain: (_method): ChainForFingerprint => 'btc',
    });

    expect(response.success).toBe(true);
    expect(response.payload).toEqual([
      {
        methodName: 'notSupported',
        network: 'eth',
        path: 'p0',
        success: false,
        payload: {
          code: HardwareErrorCode.InvalidParams,
          error: 'Unsupported allNetwork method: notSupported',
        },
      },
      {
        methodName: 'btcGetAddress',
        network: 'doge',
        path: 'p1',
        success: false,
        payload: {
          code: HardwareErrorCode.ChainNotSupported,
          error: 'unsupported network',
        },
      },
    ]);
  });
});
