import { checkLiveDeviceId } from '../src/device/deviceIdentity';
import ConfluxGetAddress from '../src/api/conflux/ConfluxGetAddress';
import ConfluxSignMessage from '../src/api/conflux/ConfluxSignMessage';
import ConfluxSignMessageCIP23 from '../src/api/conflux/ConfluxSignMessageCIP23';
import ConfluxSignTransaction from '../src/api/conflux/ConfluxSignTransaction';
import NexaSignTransaction from '../src/api/nexa/NexaSignTransaction';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('live device identity', () => {
  test.each([
    ['confluxGetAddress', ConfluxGetAddress],
    ['confluxSignMessage', ConfluxSignMessage],
    ['confluxSignMessageCIP23', ConfluxSignMessageCIP23],
    ['confluxSignTransaction', ConfluxSignTransaction],
    ['nexaSignTransaction', NexaSignTransaction],
  ])('%s requires a live device id check', (methodName, Method) => {
    const method = new Method({ payload: { method: methodName } });

    expect(method.checkDeviceId).toBe(true);
  });

  test('refreshes Protocol V2 status before comparing the expected device id', async () => {
    let currentDeviceId = 'OLD_DEVICE_ID';
    const device = {
      isProtocolV2: () => true,
      getDeviceState: jest.fn().mockImplementation(() => {
        currentDeviceId = 'NEW_DEVICE_ID';
        return Promise.resolve({ identity: { deviceId: currentDeviceId } });
      }),
      checkDeviceId: jest.fn((expected: string) => currentDeviceId === expected),
    };

    await expect(checkLiveDeviceId(device as never, 'OLD_DEVICE_ID')).resolves.toBe(false);
    expect(device.getDeviceState).toHaveBeenCalledWith({ refreshSections: ['status'] });
    expect(device.checkDeviceId).toHaveBeenCalledWith('OLD_DEVICE_ID');
  });

  test('keeps Protocol V1 identity checks on the Initialize/GetFeatures state', async () => {
    const device = {
      isProtocolV2: () => false,
      getDeviceState: jest.fn(),
      checkDeviceId: jest.fn(() => true),
    };

    await expect(checkLiveDeviceId(device as never, 'V1_DEVICE_ID')).resolves.toBe(true);
    expect(device.getDeviceState).not.toHaveBeenCalled();
  });
});
