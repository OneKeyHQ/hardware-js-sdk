import { EDeviceType, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { ProtocolV2FirmwareTargetType } from '../src/protocols/protocol-v2/firmware';
import {
  assertProtocolV2FirmwareTargetsSupported,
  isProtocolV2FirmwareFingerprintValid,
} from '../src/api/FirmwareUpdateV4';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('Protocol V2 firmware target contract', () => {
  test('matches the current firmware-pro2 target ids', () => {
    expect(ProtocolV2FirmwareTargetType).toEqual({
      FW_MGMT_TARGET_INVALID: 0,
      FW_MGMT_TARGET_CRATE: 1,
      FW_MGMT_TARGET_ROMLOADER: 2,
      FW_MGMT_TARGET_BOOTLOADER: 3,
      FW_MGMT_TARGET_APPLICATION_P1: 4,
      FW_MGMT_TARGET_APPLICATION_P2: 5,
      FW_MGMT_TARGET_COPROCESSOR: 6,
      FW_MGMT_TARGET_SE01: 7,
      FW_MGMT_TARGET_SE02: 8,
      FW_MGMT_TARGET_SE03: 9,
      FW_MGMT_TARGET_SE04: 10,
    });
  });

  test('validates the full package SHA-256 fingerprint from config', () => {
    const binary = Uint8Array.from([1, 2, 3]);

    expect(
      isProtocolV2FirmwareFingerprintValid(
        binary,
        '039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81'
      )
    ).toBe(true);
    expect(isProtocolV2FirmwareFingerprintValid(binary, '00'.repeat(32))).toBe(false);
  });

  test('allows only SE01 and SE02 firmware targets on Neo', () => {
    expect(() =>
      assertProtocolV2FirmwareTargetsSupported(EDeviceType.Neo, {
        platform: 'web',
        targetsToUpdate: ['se01', 'se02'],
      })
    ).not.toThrow();

    expect(() =>
      assertProtocolV2FirmwareTargetsSupported(EDeviceType.Neo, {
        platform: 'web',
        targetsToUpdate: ['se03'],
        se04Binary: new ArrayBuffer(1),
      })
    ).toThrow('Neo only supports SE01 and SE02; unsupported firmware targets: se03, se04');
  });

  test('ignores unselected SE binaries when the caller supplied a target subset', () => {
    const params = {
      platform: 'web' as const,
      targetsToUpdate: ['app_v1'] as Array<'app_v1'>,
      se03Binary: new ArrayBuffer(1),
      se04Binary: new ArrayBuffer(1),
    };

    expect(() =>
      assertProtocolV2FirmwareTargetsSupported(EDeviceType.Neo, params, true)
    ).not.toThrow();
    expect(() => assertProtocolV2FirmwareTargetsSupported(EDeviceType.Neo, params)).toThrow(
      'Neo only supports SE01 and SE02; unsupported firmware targets: se03, se04'
    );
  });

  test('keeps all four SE firmware targets available on Pro2', () => {
    expect(() =>
      assertProtocolV2FirmwareTargetsSupported(EDeviceType.Pro2, {
        platform: 'web',
        targetsToUpdate: ['se03'],
        se04Binary: new ArrayBuffer(1),
      })
    ).not.toThrow();
  });

  test('fails closed when SE03 or SE04 is requested without a confirmed device type', () => {
    try {
      assertProtocolV2FirmwareTargetsSupported(undefined, {
        platform: 'web',
        targetsToUpdate: ['se03'],
      });
      throw new Error('Expected unsupported target validation to fail');
    } catch (error) {
      expect(error).toMatchObject({ errorCode: HardwareErrorCode.DeviceNotSupportMethod });
      expect(error).toHaveProperty(
        'message',
        'Cannot safely update se03 without a confirmed Pro2 device type'
      );
    }
  });
});
