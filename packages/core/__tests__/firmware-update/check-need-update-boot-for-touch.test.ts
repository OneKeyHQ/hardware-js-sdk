import { EDeviceType, EFirmwareType } from '@onekeyfe/hd-shared';

import { DataManager } from '../../src/data-manager';
import { checkNeedUpdateBootForTouch } from '../../src/api/firmware/updateBootloader';

import type { Features } from '../../src/types';

jest.mock('../../src/data/config', () => ({
  getSDKVersion: () => '1.0.0',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

jest.mock('../../src/data-manager', () => ({
  DataManager: {
    getBootloaderTargetVersion: jest.fn(() => [2, 8, 3]),
  },
}));

const createFeatures = ({
  deviceType,
  firmwareVersion,
  bootloaderVersion,
}: {
  deviceType: EDeviceType;
  firmwareVersion: string;
  bootloaderVersion: string;
}) =>
  ({
    deviceType,
    serialNo: `${deviceType}-device-id`,
    firmwareVersion,
    bootloaderVersion,
  } as Features);

describe('checkNeedUpdateBootForTouch', () => {
  const firmwareType = EFirmwareType.Universal;

  beforeEach(() => {
    (DataManager.getBootloaderTargetVersion as jest.Mock).mockReturnValue([2, 8, 3]);
  });

  test('requires a Pro bootloader update when boot is older than 2.8.0', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Pro,
          firmwareVersion: '4.12.0',
          bootloaderVersion: '2.7.0',
        }),
        firmwareType
      )
    ).toBe(true);
  });

  test('requires a Pro bootloader update even when firmware is below 4.1.0', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Pro,
          firmwareVersion: '3.0.0',
          bootloaderVersion: '2.5.2',
        }),
        firmwareType
      )
    ).toBe(true);
  });

  test('requires a Pro bootloader update in bootloader mode with an unknown firmware version', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Pro,
          firmwareVersion: '0.0.0',
          bootloaderVersion: '2.7.0',
        }),
        firmwareType
      )
    ).toBe(true);
  });

  test('does not require a Pro bootloader update once boot is 2.8.4', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Pro,
          firmwareVersion: '4.12.0',
          bootloaderVersion: '2.8.4',
        }),
        firmwareType
      )
    ).toBe(false);
  });

  test('still offers an optional Pro bootloader update from 2.8.0 to 2.8.4 when firmware is 4.1.0+', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Pro,
          firmwareVersion: '4.12.0',
          bootloaderVersion: '2.8.0',
        }),
        firmwareType
      )
    ).toBe(true);
  });

  test('does not apply the Pro 2.8.0 compatibility gate to Touch', () => {
    expect(
      checkNeedUpdateBootForTouch(
        createFeatures({
          deviceType: EDeviceType.Touch,
          firmwareVersion: '3.0.0',
          bootloaderVersion: '2.7.0',
        }),
        firmwareType
      )
    ).toBe(false);
  });
});
