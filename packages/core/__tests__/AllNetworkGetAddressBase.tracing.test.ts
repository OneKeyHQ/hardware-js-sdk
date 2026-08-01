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
