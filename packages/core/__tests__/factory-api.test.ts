import DeviceInfoSettings from '../src/api/device/DeviceInfoSettings';
import DeviceReadSEPublicCert from '../src/api/device/DeviceReadSEPublicCert';
import DeviceSESignMessage from '../src/api/device/DeviceSESignMessage';
import DeviceVerify from '../src/api/device/DeviceVerify';
import DeviceWriteSEPrivateKey from '../src/api/device/DeviceWriteSEPrivateKey';
import DeviceWriteSEPublicCert from '../src/api/device/DeviceWriteSEPublicCert';
import GetDeviceInfoSettings from '../src/api/device/GetDeviceInfoSettings';
import { UI_REQUEST } from '../src/constants/ui-request';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const attachDevice = (method: object, typedCall: jest.Mock) => {
  Object.assign(method, {
    device: {
      commands: { typedCall },
    },
  });
};

describe('Pro Protocol V1 factory methods', () => {
  test('remain V1-only and available in factory bootloader mode', () => {
    const methods = [
      new DeviceInfoSettings({ id: 1, payload: { method: 'deviceInfoSettings' } }),
      new DeviceReadSEPublicCert({ id: 1, payload: { method: 'deviceReadSEPublicCert' } }),
      new DeviceSESignMessage({ id: 1, payload: { method: 'deviceSESignMessage' } }),
      new DeviceWriteSEPrivateKey({ id: 1, payload: { method: 'deviceWriteSEPrivateKey' } }),
      new DeviceWriteSEPublicCert({ id: 1, payload: { method: 'deviceWriteSEPublicCert' } }),
      new GetDeviceInfoSettings({ id: 1, payload: { method: 'deviceGetInfo' } }),
    ];

    methods.forEach(method => {
      method.init();
      expect(method.supportsProtocol('V1')).toBe(true);
      expect(method.supportsProtocol('V2')).toBe(false);
      expect(method.allowDeviceMode).toContain(UI_REQUEST.BOOTLOADER);
      expect(method.skipForceUpdateCheck).toBe(true);
    });

    const verify = new DeviceVerify({
      id: 1,
      payload: { method: 'deviceVerify', dataHex: '00' },
    });
    verify.init();
    expect(verify.allowDeviceMode).toContain(UI_REQUEST.BOOTLOADER);
  });

  test('maps the public methods to the existing Protocol V1 messages', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: {} });

    const infoSet = new DeviceInfoSettings({
      id: 1,
      payload: {
        method: 'deviceInfoSettings',
        serial_no: 'PRO00000001',
        cpu_info: 'cpu',
        pre_firmware: 'factory',
      },
    });
    infoSet.init();
    attachDevice(infoSet, typedCall);
    await infoSet.run();

    const infoGet = new GetDeviceInfoSettings({
      id: 2,
      payload: { method: 'deviceGetInfo' },
    });
    infoGet.init();
    attachDevice(infoGet, typedCall);
    await infoGet.run();

    const certificateRead = new DeviceReadSEPublicCert({
      id: 3,
      payload: { method: 'deviceReadSEPublicCert' },
    });
    certificateRead.init();
    attachDevice(certificateRead, typedCall);
    await certificateRead.run();

    const privateKeyWrite = new DeviceWriteSEPrivateKey({
      id: 4,
      payload: { method: 'deviceWriteSEPrivateKey', private_key: '' },
    });
    privateKeyWrite.init();
    attachDevice(privateKeyWrite, typedCall);
    await privateKeyWrite.run();

    const certificateWrite = new DeviceWriteSEPublicCert({
      id: 5,
      payload: { method: 'deviceWriteSEPublicCert', public_cert: 'test-certificate' },
    });
    certificateWrite.init();
    attachDevice(certificateWrite, typedCall);
    await certificateWrite.run();

    const challengeSign = new DeviceSESignMessage({
      id: 6,
      payload: { method: 'deviceSESignMessage', message: 'test-challenge' },
    });
    challengeSign.init();
    attachDevice(challengeSign, typedCall);
    await challengeSign.run();

    expect(typedCall.mock.calls).toEqual([
      [
        'DeviceInfoSettings',
        'Success',
        {
          serial_no: 'PRO00000001',
          cpu_info: 'cpu',
          pre_firmware: 'factory',
        },
      ],
      ['GetDeviceInfo', 'DeviceInfo'],
      ['ReadSEPublicCert', 'SEPublicCert'],
      ['WriteSEPrivateKey', 'Success', { private_key: '' }],
      ['WriteSEPublicCert', 'Success', { public_cert: 'test-certificate' }],
      ['SESignMessage', 'SEMessageSignature', { message: 'test-challenge' }],
    ]);
  });
});
