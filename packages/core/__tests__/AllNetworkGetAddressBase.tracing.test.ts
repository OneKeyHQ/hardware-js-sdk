import AllNetworkGetAddressBase from '../src/api/allnetwork/AllNetworkGetAddressBase';
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

    expect(checkPassphraseStateSafety).toHaveBeenCalledWith('hidden-state', false, undefined);
    expect(calls).toEqual(['resume-hidden-session', 'run-chain-method']);
    expect(typedCall).not.toHaveBeenCalled();
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
