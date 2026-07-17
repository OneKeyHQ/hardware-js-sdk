import { EDeviceType } from '@onekeyfe/hd-shared';

import DataManager from '../src/data-manager/DataManager';
import { getSupportProtocolV1MessageSchema } from '../src/utils/deviceFeaturesUtils';

import type { Features } from '../src/types';

jest.mock('../src/data/config', () => ({
  getSDKVersion: () => '1.0.0',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('getSupportProtocolV1MessageSchema', () => {
  test('Classic Pure 在无主固件的 Bootloader 模式下使用当前协议结构', () => {
    const features = {
      deviceType: EDeviceType.ClassicPure,
      bootloaderMode: true,
      firmwarePresent: false,
      firmwareVersion: '2.0.8',
    } as Features;

    const result = getSupportProtocolV1MessageSchema(features);

    expect(result.protocolV1MessageSchema).toBe('v1CurrentSchema');
    expect(result.messages).toBe(DataManager.messages.v1CurrentSchema);
  });
});
