import { EFirmwareType, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import TronSignMessage from '../src/api/tron/TronSignMessage';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('TronSignMessage init validation', () => {
  test('rejects legacy message type before device binding with the compatible firmware fallback', () => {
    const method = new TronSignMessage({
      id: 1,
      payload: {
        method: 'tronSignMessage',
        path: "m/44'/195'/0'/0/0",
        messageHex: '00',
        messageType: 'V1',
      },
    });

    try {
      method.init();
      throw new Error('Expected init to reject the legacy message type');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(HardwareError);
      if (!(error instanceof HardwareError)) return;

      expect(error.errorCode).toBe(HardwareErrorCode.DeviceNotSupportMethod);
      expect(error.params).toMatchObject({
        firmwareType: EFirmwareType.Universal,
        method: 'TronSignMessage',
      });
    }
  });
});
