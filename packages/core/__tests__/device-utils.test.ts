import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import {
  getDeviceSerialNo,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
} from '../src/utils/deviceInfoUtils';
import {
  getDeviceBLEFirmwareVersion,
  getDeviceBoardloaderVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../src/utils/deviceVersionUtils';
import {
  buildProtocolV1FeaturesPayload,
  buildProtocolV2FeaturesPayload,
} from '../src/deviceProfile';

import type { PROTO } from '../src/constants';

describe('device feature selectors', () => {
  test('reads legacy Protocol V1 features without exposing the internal builder', () => {
    const features = {
      onekey_device_type: 'CLASSIC1S',
      onekey_serial_no: 'CP123456',
      fw_vendor: 'OneKey Bitcoin-only',
      onekey_firmware_version: 'v3.5.0',
      onekey_boot_version: '2.8.0-alpha.1',
      onekey_board_version: '1.2.3+board',
      onekey_ble_version: '1.4.0+ble',
    } as PROTO.Features;

    expect(getDeviceType(features)).toBe(EDeviceType.Classic1s);
    expect(getDeviceSerialNo(features)).toBe('CP123456');
    expect(getFirmwareType(features)).toBe(EFirmwareType.BitcoinOnly);
    expect(getDeviceFirmwareVersion(features)).toEqual([3, 5, 0]);
    expect(getDeviceBootloaderVersion(features)).toEqual([2, 8, 0]);
    expect(getDeviceBoardloaderVersion(features)).toEqual([1, 2, 3]);
    expect(getDeviceBLEFirmwareVersion(features)).toEqual([1, 4, 0]);
  });

  test('keeps getDeviceUUID as a compatibility alias', () => {
    const features = {
      onekey_serial_no: 'PR123456',
      fw_vendor: 'OneKey Bitcoin-only',
      onekey_board_version: '1.2.3',
      onekey_ble_version: '2.3.4',
    } as PROTO.Features;

    expect(getDeviceUUID(features)).toBe(getDeviceSerialNo(features));
  });

  test('uses bootloader version parts from old Protocol V1 firmware', () => {
    const features = {
      bootloader_mode: true,
      major_version: 1,
      minor_version: 8,
      patch_version: 3,
      model: '1',
    } as PROTO.Features;

    expect(getDeviceType(features)).toBe(EDeviceType.Classic);
    expect(getDeviceFirmwareVersion(features)).toEqual([0, 0, 0]);
    expect(getDeviceBootloaderVersion(features)).toEqual([1, 8, 3]);
  });

  test('shares Protocol V1 compatibility semantics with the internal builder', () => {
    const rawFeatures = {
      onekey_device_type: 'PRO',
      onekey_serial_no: 'PR123456',
      onekey_firmware_version: '4.16.0',
      onekey_boot_version: '2.8.0',
      fw_vendor: 'OneKey Bitcoin-only',
    } as PROTO.Features;
    const normalized = buildProtocolV1FeaturesPayload(rawFeatures);

    expect(getDeviceType(normalized)).toBe(getDeviceType(rawFeatures));
    expect(getDeviceSerialNo(normalized)).toBe(getDeviceSerialNo(rawFeatures));
    expect(getFirmwareType(normalized)).toBe(getFirmwareType(rawFeatures));
    expect(getDeviceFirmwareVersion(normalized)).toEqual(getDeviceFirmwareVersion(rawFeatures));
    expect(getDeviceBootloaderVersion(normalized)).toEqual(getDeviceBootloaderVersion(rawFeatures));
  });

  test('reads normalized Protocol V2 features through the same public selectors', () => {
    const features = buildProtocolV2FeaturesPayload({
      deviceInfo: {
        hw: { serial_no: 'P2-001' },
        fw: {
          application: { version: '5.0.0' },
          bootloader: { version: '2.0.0' },
          romloader: { version: '1.0.0' },
        },
        coprocessor: {
          application: { version: '3.0.0' },
        },
      },
    });

    expect(getDeviceType(features)).toBe(EDeviceType.Pro2);
    expect(getDeviceSerialNo(features)).toBe('P2-001');
    expect(getDeviceFirmwareVersion(features)).toEqual([5, 0, 0]);
    expect(getDeviceBootloaderVersion(features)).toEqual([2, 0, 0]);
    expect(getDeviceBoardloaderVersion(features)).toEqual([1, 0, 0]);
    expect(getDeviceBLEFirmwareVersion(features)).toEqual([3, 0, 0]);
  });
});
