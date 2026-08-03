import { EFirmwareType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../src/api/BaseMethod';
import { findMethod } from '../src/api/utils';
import BTCGetAddress from '../src/api/btc/BTCGetAddress';
import DeviceReboot from '../src/api/protocol-v2/DeviceReboot';
import SolGetAddress from '../src/api/solana/SolGetAddress';
import StellarGetAddress from '../src/api/stellar/StellarGetAddress';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

class DefaultMethod extends BaseMethod {
  init() {}

  async run() {
    return Promise.resolve({});
  }
}

describe('method protocol support', () => {
  test('creates a protocol detection method that returns only the current protocol', async () => {
    const method = findMethod({
      id: 6,
      payload: {
        method: 'detectDeviceConnectProtocol',
        connectId: 'ble-device',
      },
    } as never);

    method.init();
    (method as unknown as { device: unknown }).device = {
      getProtocol: () => 'V2',
    };

    expect(method.getSupportedProtocols()).toEqual(['V1', 'V2']);
    await expect(method.run()).resolves.toBe('V2');
  });

  test('defaults existing methods to Protocol V1 only', () => {
    const method = new DefaultMethod({
      id: 1,
      payload: { method: 'defaultMethod' },
    });

    expect(method.getSupportedProtocols()).toEqual(['V1']);
    expect(method.supportsProtocol('V1')).toBe(true);
    expect(method.supportsProtocol('V2')).toBe(false);
  });

  test('returns the canonical unsupported error before method execution', () => {
    const method = new DefaultMethod({
      id: 1,
      payload: { method: 'defaultMethod' },
    });
    const run = jest.spyOn(method, 'run');

    expect(() => method.assertProtocolSupported('V2', EFirmwareType.Universal)).toThrow(
      expect.objectContaining({
        errorCode: HardwareErrorCode.DeviceNotSupportMethod,
      })
    );
    expect(run).not.toHaveBeenCalled();
  });

  test('declares Protocol V2-only methods explicitly', () => {
    const method = new DeviceReboot({
      id: 1,
      payload: { method: 'deviceReboot', rebootType: 0 },
    });

    method.init();

    expect(method.getSupportedProtocols()).toEqual(['V2']);
  });

  test('distinguishes shared and Protocol V1-only chain methods', () => {
    const solana = new SolGetAddress({
      id: 1,
      payload: {
        method: 'solGetAddress',
        path: "m/44'/501'/0'/0'",
        showOnOneKey: false,
      },
    });
    const stellar = new StellarGetAddress({
      id: 2,
      payload: {
        method: 'stellarGetAddress',
        path: "m/44'/148'/0'",
        showOnOneKey: false,
      },
    });

    solana.init();
    stellar.init();

    expect(solana.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(stellar.getSupportedProtocols()).toEqual(['V1']);
  });

  test('evaluates parameter-dependent Protocol V2 support separately from firmware ranges', () => {
    const bitcoin = new BTCGetAddress({
      id: 1,
      payload: {
        method: 'btcGetAddress',
        path: "m/44'/0'/0'/0/0",
        coin: 'btc',
        showOnOneKey: false,
      },
    });
    const neurai = new BTCGetAddress({
      id: 2,
      payload: {
        method: 'btcGetAddress',
        path: "m/44'/1900'/0'/0/0",
        coin: 'Neurai',
        showOnOneKey: false,
      },
    });

    bitcoin.init();
    neurai.init();

    expect(bitcoin.getSupportedProtocols()).toEqual(['V1', 'V2']);
    expect(neurai.getSupportedProtocols()).toEqual(['V1']);
    expect(bitcoin.getVersionRange().pro2).toBeUndefined();
    expect(neurai.getVersionRange().pro2).toBeUndefined();
  });
});
