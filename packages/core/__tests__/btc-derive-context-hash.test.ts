import { EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import BTCDeriveContextHash from '../src/api/btc/BTCDeriveContextHash';
import { findMethod } from '../src/api/utils';
import { getLogBlockLabel, getSafeLogPayload } from '../src/events/logBlockEvent';
import { createCoreApi } from '../src/inject';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

const createMethod = (overrides: Record<string, unknown> = {}) =>
  new BTCDeriveContextHash({
    id: 1,
    payload: {
      method: 'btcDeriveContextHash',
      path: "m/84'/0'/0'/0/0",
      appName: 'test-app',
      context: 'deadbeef',
      network: 'bitcoin-mainnet',
      ...overrides,
    },
  });

describe('btcDeriveContextHash', () => {
  test('forwards the public API call through the existing dispatcher', async () => {
    const call = jest
      .fn()
      .mockResolvedValue({ success: true, payload: { secret: '00'.repeat(32) } });
    const api = createCoreApi(call);
    const params = {
      path: "m/84'/0'/0'/0/0",
      appName: 'test-app',
      context: 'deadbeef',
      network: 'bitcoin-mainnet' as const,
    };
    await api.btcDeriveContextHash('connect-id', 'device-id', params);
    expect(call).toHaveBeenCalledWith({
      ...params,
      connectId: 'connect-id',
      deviceId: 'device-id',
      method: 'btcDeriveContextHash',
    });
  });

  test.each([
    ['bitcoin-mainnet', 'BITCOIN_MAINNET'],
    ['bitcoin-testnet', 'BITCOIN_TESTNET'],
    ['bitcoin-signet', 'BITCOIN_SIGNET'],
    ['bitcoin-regtest', 'BITCOIN_REGTEST'],
  ])('maps %s and returns the device result', async (network, wireNetwork) => {
    const method = createMethod({ network });
    method.init();
    const response = { secret: '00'.repeat(32) };
    const typedCall = jest.fn().mockResolvedValue({ message: response });
    method.device = { commands: { typedCall } } as unknown as Device;

    await expect(method.run()).resolves.toBe(response);
    expect(typedCall).toHaveBeenCalledWith(
      'BabylonDeriveContextHash',
      'BabylonDerivedContextHash',
      {
        address_n: [2147483732, 2147483648, 2147483648, 0, 0],
        script_type: 'SPENDWITNESS',
        app_name: '746573742d617070',
        context: 'deadbeef',
        network: wireNetwork,
      }
    );
  });

  test.each([
    ["m/44'/0'/0'/0/0", 'SPENDADDRESS'],
    ["m/49'/0'/0'/0/0", 'SPENDP2SHWITNESS'],
    [[2147483734, 2147483648, 2147483648, 0, 0], 'SPENDTAPROOT'],
  ])('uses the selected path script type for %s', (path, scriptType) => {
    const method = createMethod({ path });
    method.init();
    expect(method.params.script_type).toBe(scriptType);
  });

  test('accepts the maximum app name and context sizes', () => {
    const method = createMethod({ appName: 'a'.repeat(64), context: 'ab'.repeat(1024) });
    expect(() => method.init()).not.toThrow();
    expect(method.params.context).toHaveLength(2048);
  });

  test.each([
    { appName: '' },
    { appName: 'a'.repeat(65) },
    { appName: 'Test-App' },
    { appName: 'test_app' },
    { appName: '你好' },
    { appName: null },
    { context: '' },
    { context: 'abc' },
    { context: 'DEADBEEF' },
    { context: '0xdeadbeef' },
    { context: 'gg' },
    { context: 'ab'.repeat(1025) },
    { context: null },
    { network: '' },
    { network: 'litecoin' },
    { network: 'toString' },
    { network: 1 },
    { path: 'm' },
    { path: "m/84x'/0'/0'/0/0" },
    { path: "m/2147483648'/0'/0'/0/0" },
    { path: [2147483732, 2147483648, 2147483648, 0, 0.5] },
    { path: [2147483732, 2147483648, 2147483648, 0, 4294967296] },
  ])('rejects invalid inputs before a device call: %j', overrides => {
    expect(() => createMethod(overrides).init()).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
    );
  });

  test('rejects sparse numeric paths before a device call', () => {
    const sparsePath = [2147483732, 2147483648, 2147483648, 0, 5];
    delete sparsePath[3];

    [Array<number>(3), sparsePath].forEach(path => {
      expect(() => createMethod({ path }).init()).toThrow(
        expect.objectContaining({ errorCode: HardwareErrorCode.CallMethodInvalidParameter })
      );
    });
  });

  test('registers the public method and restricts it to supported firmware and protocol', () => {
    const method = findMethod({ id: 1, payload: { ...createMethod().payload } });
    method.init();
    expect(method).toBeInstanceOf(BTCDeriveContextHash);
    expect(method.strictCheckDeviceSupport).toBe(true);
    expect(method.getVersionRange()).toEqual({ classic1s: { min: '3.21.0' } });
    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({ errorCode: HardwareErrorCode.DeviceNotSupportMethod })
    );
  });

  test('propagates device rejection without returning a secret', async () => {
    const method = createMethod();
    method.init();
    const error = new Error('User rejected');
    method.device = {
      commands: { typedCall: jest.fn().mockRejectedValue(error) },
    } as unknown as Device;
    await expect(method.run()).rejects.toBe(error);
  });

  test.each([undefined, '00', '00'.repeat(33)])(
    'rejects malformed device responses',
    async secret => {
      const method = createMethod();
      method.init();
      method.device = {
        commands: { typedCall: jest.fn().mockResolvedValue({ message: { secret } }) },
      } as unknown as Device;
      await expect(method.run()).rejects.toMatchObject({
        errorCode: HardwareErrorCode.CallMethodError,
      });
    }
  );

  test('blocks API request and response payloads in logs', () => {
    const request = { payload: { method: 'btcDeriveContextHash' } };
    const label = getLogBlockLabel(request);
    expect(label).toBe('btcDeriveContextHash');
    expect(getSafeLogPayload({ payload: { secret: '00'.repeat(32) } }, label)).toEqual({
      method: 'btcDeriveContextHash',
      payload: '[REDACTED]',
    });
  });
});
