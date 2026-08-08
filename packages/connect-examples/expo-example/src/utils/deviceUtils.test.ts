import { getDeviceBasicInfo } from './deviceUtils';

import type { Features } from '@onekeyfe/hd-core';

describe('getDeviceBasicInfo', () => {
  test('统一拼接投影字段中的版本与构建 ID，不产生 undefined 文案', () => {
    const features = {
      deviceType: 'pro2',
      serialNo: 'PRO2-SERIAL',
      firmwareVersion: '1.2.0',
      bootloaderVersion: '1.0.1',
      boardVersion: '0.9.0',
      bleVersion: '2.1.0',
      onekey_firmware_build_id: 'fw-build',
      onekey_boot_build_id: 'boot-build',
      onekey_board_build_id: 'board-build',
      onekey_ble_build_id: 'ble-build',
    } as Features;

    expect(getDeviceBasicInfo(features, undefined)).toMatchObject({
      deviceType: 'PRO2',
      serialNumber: 'PRO2-SERIAL',
      firmwareVersion: '1.2.0-fw-build',
      bootloaderVersion: '1.0.1-boot-build',
      boardloaderVersion: '0.9.0-board-build',
      bleVersion: '2.1.0-ble-build',
    });
  });
});
