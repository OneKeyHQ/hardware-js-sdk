import { EFirmwareType, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

import TronSignMessage from '../src/api/tron/TronSignMessage';

import type { Device } from '../src/device/Device';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('TronSignMessage legacy message validation', () => {
  test.each([EFirmwareType.BitcoinOnly, EFirmwareType.Universal])(
    'reports the current device firmware type after binding: %s',
    async firmwareType => {
      const method = new TronSignMessage({
        id: 1,
        payload: {
          method: 'tronSignMessage',
          path: "m/44'/195'/0'/0/0",
          messageHex: '00',
          messageType: 'V1',
        },
      });

      method.init();
      method.device = {
        getCurrentFirmwareType: jest.fn(() => firmwareType),
      } as unknown as Device;

      try {
        await method.run();
        throw new Error('Expected run to reject the legacy message type');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HardwareError);
        if (!(error instanceof HardwareError)) return;

        expect(error.errorCode).toBe(HardwareErrorCode.DeviceNotSupportMethod);
        expect(error.params).toMatchObject({
          firmwareType,
          method: 'TronSignMessage',
        });
      }
    }
  );
});
