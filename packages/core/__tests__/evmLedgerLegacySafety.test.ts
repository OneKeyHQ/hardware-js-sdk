import { Enum_SafetyCheckLevel } from '@onekeyfe/hd-transport';

import AllNetworkGetAddressBase from '../src/api/allnetwork/AllNetworkGetAddressBase';
import EvmGetAddress from '../src/api/evm/EVMGetAddress';
import EVMGetPublicKey from '../src/api/evm/EVMGetPublicKey';
import { findMethod } from '../src/api/utils';
import { getDeviceType, getFirmwareType, getMethodVersionRange } from '../src/utils';
import { getDeviceFirmwareVersion } from '../src/utils/deviceVersionUtils';

import type { EDeviceType } from '@onekeyfe/hd-shared';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/api/utils', () => ({
  findMethod: jest.fn(),
}));

const createDevice = (onekeyDeviceType: string) => {
  const typedCall = jest.fn();
  const features = {
    onekey_device_type: onekeyDeviceType,
    deviceType: onekeyDeviceType.toLowerCase() as EDeviceType,
    safety_checks: Enum_SafetyCheckLevel.Strict,
  };
  return {
    typedCall,
    device: {
      features,
      commands: {
        typedCall,
      },
      // BaseMethod reads state through Device accessors; reuse production mappers in the stub.
      isProtocolV2: () => false,
      getProtocol: () => 'V1' as const,
      getCurrentDeviceType: () => getDeviceType(features as any),
      getCurrentSafetyChecks: () => features.safety_checks,
      getCurrentFirmwareType: () => getFirmwareType(features as any),
      getCurrentFirmwareVersionString: () => getDeviceFirmwareVersion(features as any)?.join('.'),
      getCurrentMethodVersionRange: (fn: (model: any) => any) =>
        getMethodVersionRange(features as any, fn),
    },
  };
};

class TestAllNetworkMethod extends AllNetworkGetAddressBase {
  async getAllNetworkAddress() {
    return Promise.resolve([]);
  }
}

describe('EVM Ledger legacy path safety checks', () => {
  it.each([
    ['evmGetAddress', EvmGetAddress],
    ['evmGetPublicKey', EVMGetPublicKey],
  ])(
    'temporarily relaxes safety checks for Pro %s on ledger legacy path index greater than 1',
    async (methodName, Method) => {
      const { device, typedCall } = createDevice('PRO');
      const method = new Method({
        id: 1,
        payload: {
          method: methodName,
          path: "m/44'/60'/0'/2",
        },
      });
      method.device = device as any;

      await method.checkSafetyLevelOnTestNet();

      expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
        safety_checks: Enum_SafetyCheckLevel.PromptTemporarily,
      });
    }
  );

  it('temporarily relaxes safety checks for Touch get public key on ledger legacy path index greater than 1', async () => {
    const { device, typedCall } = createDevice('TOUCH');
    const method = new EVMGetPublicKey({
      id: 1,
      payload: {
        method: 'evmGetPublicKey',
        path: "m/44'/60'/0'/2",
      },
    });
    method.device = device as any;

    await method.checkSafetyLevelOnTestNet();

    expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
      safety_checks: Enum_SafetyCheckLevel.PromptTemporarily,
    });
  });

  it('runs EVM safety checks when allNetwork dispatches to the inner get address method', async () => {
    const { device, typedCall } = createDevice('PRO');
    (findMethod as jest.Mock).mockImplementation(message => new EvmGetAddress(message));
    const runSpy = jest.spyOn(EvmGetAddress.prototype, 'run').mockResolvedValue([
      {
        path: "m/44'/60'/0'/2",
        address: '0x0000000000000000000000000000000000000000',
      },
    ]);
    const method = new TestAllNetworkMethod({
      id: 1,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        bundle: [],
      },
    });
    method.device = {
      ...device,
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            path: "m/44'/60'/0'/2",
            showOnOneKey: false,
            chainId: 1,
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/2",
              showOnOneKey: false,
              chainName: '1',
            },
          },
        ],
      },
      0
    );

    expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
      safety_checks: Enum_SafetyCheckLevel.PromptTemporarily,
    });

    runSpy.mockRestore();
  });

  it('only applies temporary safety checks once during one allNetwork request even when features stay strict', async () => {
    const { device, typedCall } = createDevice('PRO');
    (findMethod as jest.Mock).mockImplementation(message => new EvmGetAddress(message));
    const runSpy = jest
      .spyOn(EvmGetAddress.prototype, 'run')
      .mockResolvedValueOnce([
        {
          path: "m/44'/60'/0'/2",
          address: '0x0000000000000000000000000000000000000002',
        },
      ])
      .mockResolvedValueOnce([
        {
          path: "m/44'/60'/0'/3",
          address: '0x0000000000000000000000000000000000000003',
        },
      ]);
    const method = new TestAllNetworkMethod({
      id: 1,
      payload: {
        method: 'allNetworkGetAddressByLoop',
        connectId: 'connect-id',
        deviceId: 'device-id',
        bundle: [],
      },
    });
    method.device = {
      ...device,
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            path: "m/44'/60'/0'/2",
            showOnOneKey: false,
            chainId: 1,
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/2",
              showOnOneKey: false,
              chainName: '1',
            },
          },
        ],
      },
      0
    );

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            path: "m/44'/60'/0'/3",
            showOnOneKey: false,
            chainId: 1,
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/3",
              showOnOneKey: false,
              chainName: '1',
            },
          },
        ],
      },
      0
    );

    expect(typedCall).toHaveBeenCalledTimes(1);
    expect(typedCall).toHaveBeenCalledWith('ApplySettings', 'Success', {
      safety_checks: Enum_SafetyCheckLevel.PromptTemporarily,
    });

    runSpy.mockRestore();
  });

  it.each(["m/44'/60'/0'/0", "m/44'/60'/0'/1"])(
    'keeps safety checks unchanged for legal ledger legacy path %s',
    async path => {
      const { device, typedCall } = createDevice('PRO');
      const method = new EvmGetAddress({
        id: 1,
        payload: {
          method: 'evmGetAddress',
          path,
        },
      });
      method.device = device as any;

      await method.checkSafetyLevelOnTestNet();

      expect(typedCall).not.toHaveBeenCalled();
    }
  );

  it('keeps safety checks unchanged for standard 5-segment BIP44 paths', async () => {
    const { device, typedCall } = createDevice('PRO');
    const method = new EvmGetAddress({
      id: 1,
      payload: {
        method: 'evmGetAddress',
        path: "m/44'/60'/0'/0/2",
      },
    });
    method.device = device as any;

    await method.checkSafetyLevelOnTestNet();

    expect(typedCall).not.toHaveBeenCalled();
  });

  it('keeps safety checks unchanged on non Pro/Touch devices', async () => {
    const { device, typedCall } = createDevice('MINI');
    const method = new EvmGetAddress({
      id: 1,
      payload: {
        method: 'evmGetAddress',
        path: "m/44'/60'/0'/2",
      },
    });
    method.device = device as any;

    await method.checkSafetyLevelOnTestNet();

    expect(typedCall).not.toHaveBeenCalled();
  });
});
