import AllNetworkGetAddressBase from '../src/api/allnetwork/AllNetworkGetAddressBase';
import AllNetworkGetAddress from '../src/api/allnetwork/AllNetworkGetAddress';
import { findMethod } from '../src/api/utils';
import { getActiveRequestsByDeviceInstance } from '../src/utils/tracing';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../src/api/utils', () => ({
  findMethod: jest.fn(),
}));

class TestAllNetworkMethod extends AllNetworkGetAddressBase {
  async getAllNetworkAddress() {
    return Promise.resolve([]);
  }
}

describe('AllNetworkGetAddressBase tracing', () => {
  test('resumes a Protocol V2 hidden wallet before running a nested chain method', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('resume-hidden-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'evmGetAddress',
      responseID: 43,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-chain-method');
        return Promise.resolve([{ address: '0xhidden' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 1,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        passphraseState: 'hidden-state',
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = { preflightCompleted: true };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      'hidden-state',
      false,
      undefined,
      undefined,
      undefined
    );
    expect(calls).toEqual(['resume-hidden-session', 'run-chain-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('resumes a Protocol V2 Cardano hidden wallet with the Cardano seed domain', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('resume-cardano-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'cardanoGetAddress',
      responseID: 45,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-cardano-method');
        return Promise.resolve([{ address: 'addr1hidden' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 5,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        passphraseState: 'hidden-state',
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = { preflightCompleted: true };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'cardanoGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'ada',
              path: "m/1852'/1815'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      'hidden-state',
      false,
      undefined,
      true,
      undefined
    );
    expect(calls).toEqual(['resume-cardano-session', 'run-cardano-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('resumes a Protocol V2 standard wallet before running a nested chain method', async () => {
    const calls: string[] = [];
    const checkPassphraseStateSafety = jest.fn().mockImplementation(() => {
      calls.push('resume-standard-session');
      return Promise.resolve(true);
    });
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'evmGetAddress',
      responseID: 44,
      unlockPolicy: 'unlock-before-run',
      run: jest.fn().mockImplementation(() => {
        calls.push('run-chain-method');
        return Promise.resolve([{ address: '0xstandard' }]);
      }),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
    const method = new TestAllNetworkMethod({
      id: 2,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [],
      },
    });
    method.protocolV2UnlockContext = {
      preflightCompleted: true,
      preflightMainPinSelected: true,
    };
    const typedCall = jest.fn();
    method.device = {
      checkPassphraseStateSafety,
      commands: {
        typedCall,
      },
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V2'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('pro2')),
      instanceId: 'device-instance',
      isProtocolV2: jest.fn().mockReturnValue(true),
      isBootloader: jest.fn().mockReturnValue(false),
      isRomloader: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
      state: { status: { unlocked: true } },
      updateProtocolV2Status: jest.fn(),
    } as any;

    await method.callMethod(
      'evmGetAddress',
      {
        bundle: [
          {
            _originRequestParams: {
              network: 'evm',
              path: "m/44'/60'/0'/0/0",
            },
          },
        ],
      },
      0
    );

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith(
      undefined,
      true,
      undefined,
      undefined,
      true
    );
    expect(calls).toEqual(['resume-standard-session', 'run-chain-method']);
    expect(typedCall).not.toHaveBeenCalled();
  });

  test('runs Protocol V2 addresses one at a time so each command receives a wallet session', async () => {
    const method = new AllNetworkGetAddress({
      id: 3,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0" },
          { network: 'evm', path: "m/44'/60'/0'/0/1" },
        ],
      },
    });
    method.device = {
      isProtocolV2: jest.fn().mockReturnValue(true),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest
      .fn()
      .mockResolvedValueOnce([{ payload: { address: '0x1' }, success: true }])
      .mockResolvedValueOnce([{ payload: { address: '0x2' }, success: true }]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(2);
    expect(callMethod).toHaveBeenNthCalledWith(
      1,
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object)] }),
      7
    );
    expect(callMethod).toHaveBeenNthCalledWith(
      2,
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object)] }),
      7
    );
  });

  test('keeps same-method address batching for Protocol V1', async () => {
    const method = new AllNetworkGetAddress({
      id: 4,
      payload: {
        method: 'allNetworkGetAddress',
        connectId: 'connect-id',
        deviceId: 'device-id',
        useEmptyPassphrase: true,
        bundle: [
          { network: 'evm', path: "m/44'/60'/0'/0/0" },
          { network: 'evm', path: "m/44'/60'/0'/0/1" },
        ],
      },
    });
    method.device = {
      isProtocolV2: jest.fn().mockReturnValue(false),
    } as any;
    method.postMessage = jest.fn();
    const callMethod = jest.fn().mockResolvedValue([
      { payload: { address: '0x1' }, success: true },
      { payload: { address: '0x2' }, success: true },
    ]);
    method.callMethod = callMethod;

    await method.getAllNetworkAddress(7);

    expect(callMethod).toHaveBeenCalledTimes(1);
    expect(callMethod).toHaveBeenCalledWith(
      'evmGetAddress',
      expect.objectContaining({ bundle: [expect.any(Object), expect.any(Object)] }),
      7
    );
  });

  test('releases the nested request context when an unhandled error escapes', async () => {
    const deviceInstanceId = 'device-instance';
    const innerMethod = {
      checkSafetyLevelOnTestNet: jest.fn().mockResolvedValue(false),
      connectId: 'connect-id',
      deviceId: 'device-id',
      getVersionRange: jest.fn().mockReturnValue({}),
      assertProtocolSupported: jest.fn(),
      init: jest.fn(),
      name: 'xrpGetAddress',
      responseID: 42,
      run: jest.fn().mockRejectedValue(new Error('address failed')),
      setDevice: jest.fn(),
      strictCheckDeviceSupport: false,
    };
    (findMethod as jest.Mock).mockReturnValue(innerMethod);
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
      instanceId: deviceInstanceId,
      getCurrentFirmwareType: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('V1'),
      getCurrentFirmwareVersionString: jest.fn().mockReturnValue('1.0.0'),
      getCurrentMethodVersionRange: jest
        .fn()
        .mockImplementation((getRange: (type: string) => unknown) => getRange('classic')),
      isProtocolV2: jest.fn().mockReturnValue(false),
      off: jest.fn(),
      on: jest.fn(),
    } as any;

    await expect(
      method.callMethod(
        'xrpGetAddress',
        {
          bundle: [
            {
              _originRequestParams: {
                network: 'xrp',
                path: "m/44'/144'/0'/0/0",
              },
            },
          ],
        },
        0
      )
    ).rejects.toThrow('address failed');

    expect(getActiveRequestsByDeviceInstance(deviceInstanceId)).toEqual([]);
  });
});
