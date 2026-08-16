import DeviceReadSEPublicCert from '../src/api/device/DeviceReadSEPublicCert';
import DeviceSESignMessage from '../src/api/device/DeviceSESignMessage';
import DeviceVerify from '../src/api/device/DeviceVerify';
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

describe('Pro Protocol V1 secure-element methods', () => {
  test('remain V1-only and available in bootloader mode', () => {
    const methods = [
      new DeviceReadSEPublicCert({ id: 1, payload: { method: 'deviceReadSEPublicCert' } }),
      new DeviceSESignMessage({ id: 1, payload: { method: 'deviceSESignMessage' } }),
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

    const certificateRead = new DeviceReadSEPublicCert({
      id: 1,
      payload: { method: 'deviceReadSEPublicCert' },
    });
    certificateRead.init();
    attachDevice(certificateRead, typedCall);
    await certificateRead.run();

    const challengeSign = new DeviceSESignMessage({
      id: 2,
      payload: { method: 'deviceSESignMessage', message: 'test-challenge' },
    });
    challengeSign.init();
    attachDevice(challengeSign, typedCall);
    await challengeSign.run();

    expect(typedCall.mock.calls).toEqual([
      ['ReadSEPublicCert', 'SEPublicCert'],
      ['SESignMessage', 'SEMessageSignature', { message: 'test-challenge' }],
    ]);
  });
});
